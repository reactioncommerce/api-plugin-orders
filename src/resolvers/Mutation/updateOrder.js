import {decodeOrderOpaqueId, decodeAccountOpaqueId} from "../../xforms/id.js";

/**
 * @name Mutation/updateOrder
 * @method
 * @memberof Payments/GraphQL
 * @summary resolver for the updateOrder GraphQL mutation
 * @param {Object} parentResult - unused
 * @param {Object} args.input - an object of all mutation arguments that were sent by the client
 * @param {Object} [args.input.customFields] - Updated custom fields
 * @param {String} [args.input.email] - Set this as the order email
 * @param {String} args.input.orderId - The order ID
 * @param {String} [args.input.status] - Set this as the current order status
 * @param {String} [args.input.clientMutationId] - An optional string identifying the mutation call
 * @param {Object} context - an object containing the per-request state
 * @returns {Promise<Object>} UpdateOrderPayload
 */
export default async function updateOrder(parentResult, {input}, context) {
  const {
    clientMutationId = null,
    customFields,
    email,
    orderId,
    status,
    accountId,
    assignedTo,
    notes,
    preferredDeliveryDate,
    alternativePhone,
    imageRequestedDeclined,
    videoRequestedDeclined
  } = input;

  const {order} = await context.mutations.updateOrder(context, {
    customFields,
    email,
    accountId: decodeAccountOpaqueId(accountId),
    orderId: decodeOrderOpaqueId(orderId),
    status,
    assignedTo,
    notes,
    preferredDeliveryDate,
    alternativePhone,
    imageRequestedDeclined,
    videoRequestedDeclined
  });

  return {
    clientMutationId,
    order
  };
}
