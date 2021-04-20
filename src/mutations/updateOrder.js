import SimpleSchema from "simpl-schema";
import ReactionError from "@reactioncommerce/reaction-error";
import {Order as OrderSchema} from "../simpleSchemas.js";

const noteInput = new SimpleSchema({
  content: {
    type: String,
    optional: true
  },
  isModified: {
    type: Boolean,
    optional: true,
    defaultValue:false
  }
});
const inputSchema = new SimpleSchema({
  customFields: {
    type: Object,
    blackbox: true,
    optional: true
  },
  email: {
    type: String,
    optional: true
  },
  orderId: String,
  accountId: {
    type: String,
    optional: true,
  },
  status: {
    type: String,
    optional: true
  },
  assignedTo: {
    type: String,
    optional: true
  },
  notes: {
    type: Array,
    optional: true
  },
  "notes.$":noteInput,
  preferredDeliveryDate:{
    type:Date,
    optional:true
  },
  alternativePhone: {
    type: String,
    optional: true
  }
});

/**
 * @method updateOrder
 * @summary Use this mutation to update order status, email, and other
 *   properties
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Necessary input. See SimpleSchema
 * @returns {Promise<Object>} Object with `order` property containing the updated order
 */
export default async function updateOrder(context, input) {
  inputSchema.validate(input);

  const {
    customFields,
    email,
    accountId,
    orderId,
    status,
    assignedTo,
    preferredDeliveryDate,
    // deliveryUrgency,
    // requestedImageUrls,
    // requestedVideoUrls,
    notes,
    alternativePhone,
    // deliveryDate,
  } = input;

  const {appEvents, collections, userId} = context;
  const {Orders} = collections;

  // First verify that this order actually exists
  const order = await Orders.findOne({_id: orderId});
  if (!order) throw new ReactionError("not-found", "Order not found");

  // At this point, this mutation only updates the workflow status, which should not be allowed
  // for the order creator. In the future, if this mutation does more, we should revisit these
  // permissions to see if order owner should be allowed.
  await context.validatePermissions(
    `reaction:legacy:orders:${order._id}`,
    "update:deliveryInfo",
    {shopId: order.shopId}
  );

  const modifier = {
    $set: {
      updatedAt: new Date()
    }
  };

  switch (assignedTo) {
    case "deliveryRepresentative":
      if (order.deliveryRepresentative !== userId) {
        throw new ReactionError("access-denied", "Order is not assigned to particular delivery representative.");
      }
      if (status && status !== "coreOrderWorkflow/shipped" && status !== "coreOrderWorkflow/completed" && status !== "coreOrderWorkflow/exception") {
        throw new ReactionError("access-denied", `User cannot add ${status} status to order.`);
      }

      break;

    case "fulfillmentManager":
      if (order.fulfillmentManager !== userId) {
        throw new ReactionError("access-denied", "Order is not assigned to particular delivery representative.");
      }
      if (email) modifier.$set.email = email;
      if (customFields) modifier.$set.customFields = customFields;
      if (alternativePhone) modifier.$set.alternativePhone = alternativePhone;
      if (preferredDeliveryDate) {
        modifier.$set.preferredDeliveryDate = preferredDeliveryDate;
        modifier.$set.deliveryUrgency = "";
      }
      break;

    default:
      await context.validatePermissions(
        `reaction:legacy:orders:${order._id}`,
        "update",
        {shopId: order.shopId}
      );
      if (email) modifier.$set.email = email;
      if (accountId) modifier.$set.accountId = accountId;
      if (customFields) modifier.$set.customFields = customFields;
      if (alternativePhone) modifier.$set.alternativePhone = alternativePhone;
      if (preferredDeliveryDate)
      {
        modifier.$set.preferredDeliveryDate = preferredDeliveryDate;
        modifier.$set.deliveryUrgency = "";
      }
  }

  if (notes) modifier.$set.notes = getNotes(order.notes||[],notes,userId);

  if (status && order.workflow.status !== status) {
    modifier.$set["workflow.status"] = status;
    modifier.$push = {
      "workflow.workflow": status
    };
  }

  // Skip updating if we have no updates to make
  if (Object.keys(modifier.$set).length === 1) return {order};

  OrderSchema.validate(modifier, {modifier: true});

  const {modifiedCount, value: updatedOrder} = await Orders.findOneAndUpdate(
    {_id: orderId},
    modifier,
    {returnOriginal: false}
  );
  if (modifiedCount === 0 || !updatedOrder) throw new ReactionError("server-error", "Unable to update order");

  await appEvents.emit("afterOrderUpdate", {
    order: updatedOrder,
    updatedBy: userId
  });

  return {order: updatedOrder};
}

function getNotes(oldNotes, newNotes, userId) {
  let notes = [];
  newNotes.map((newNote, index) => {
      let note = {};
      if (!newNote.isModified && index < oldNotes.length) {
        note = {
          content: oldNotes[index].content,
          userId: oldNotes[index].userId,
          updatedAt: oldNotes[index].updatedAt
        };
      } else {
        note = {
          content: newNote.content,
          userId,
          updatedAt: new Date()
        };
      }
      notes.push(note);
    }
  )
  return notes;
}
