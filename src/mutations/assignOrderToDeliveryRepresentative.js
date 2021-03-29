import SimpleSchema from "simpl-schema";
import ReactionError from "@reactioncommerce/reaction-error";
import {Order as OrderSchema} from "../simpleSchemas.js";

const inputSchema = new SimpleSchema({
  shopId: String,
  orderId: String,
  accountId: String,
  groupId: String
});

/**
 * @method updateOrder
 * @summary Use this mutation to update order status, email, and other
 *   properties
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Necessary input. See SimpleSchema
 * @returns {Promise<Object>} Object with `order` property containing the updated order
 */
export default async function assignOrderToDeliveryRepresentative(context, input) {
  inputSchema.validate(input);

  const {
    shopId,
    orderId,
    accountId,
    groupId
  } = input;

  const {appEvents, collections: {Orders, Accounts, Groups}, userId} = context;

  // First verify that this order actually exists
  const order = await Orders.findOne({_id: orderId});
  if (!order) throw new ReactionError("not-found", "Order not found");

  await context.validatePermissions(
    `reaction:legacy:orders:${order._id}`,
    "assign:deliveryRepresentative",
    {shopId: shopId}
  );

  // Verify that provided group exists
  const groupExists = await Groups.findOne({_id:groupId,shopId});
  if (!groupExists) throw new ReactionError("not-found", "Group not found");
  console.log(groupExists);
  if(groupExists.name!=="delivery representative") throw new ReactionError("invalid-group", "Invalid group is being assigned");

  //verify that accountId belongs to fulfillment manager group
  const accountExists = await Accounts.findOne({_id: accountId, groups: groupExists._id});
  console.log(accountExists);
  if (!accountExists) throw new ReactionError("not-found", "Account with provided role does not exist");

  // At this point, this mutation only updates the workflow status, which should not be allowed
  // for the order creator. In the future, if this mutation does more, we should revisit these
  // permissions to see if order owner should be allowed.


  const modifier = {
    $set: {
      deliveryRepresentative: accountExists._id,
    }
  };

  OrderSchema.validate(modifier, {modifier: true});

  const {modifiedCount, value: updatedOrder} = await Orders.findOneAndUpdate(
    {_id: orderId},
    modifier,
    {returnOriginal: false}
  );
  if (modifiedCount === 0 || !updatedOrder) throw new ReactionError("server-error", "Unable to update order");

  // await appEvents.emit("afterOrderUpdate", {
  //   order: updatedOrder,
  //   updatedBy: userId
  // });

  return {order: updatedOrder};
}
