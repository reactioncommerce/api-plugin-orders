import {
  decodeOrderOpaqueId,
  decodeAccountOpaqueId,
  decodeShopOpaqueId,
  decodeGroupOpaqueId,
  encodeAccountOpaqueId,
  encodeShopOpaqueId,
  encodeOrderOpaqueId
} from "../../xforms/id.js";

/**
 * @name Mutation/assignOrderToDeliveryRepresentative
 * @method
 * @summary resolver for the assignOrderToDeliveryRepresentative GraphQL mutation
 * @param {Object} args.input - an object of all mutation arguments that were sent by the client
 * @param {Object} [args.input.shopId] - The shop ID
 * @param {String} [args.input.orderId] - The order ID
 * @param {String} args.input.accountId - ID of delivery representative
 * @param {Object} context - an object containing the per-request state
 * @returns {Promise<Object>} AssignOrderToAccountPayload
 */
export default async function assignOrderToDeliveryRepresentative(parentResult, {input}, context) {
  const {
    shopId,
    orderId,
    accountId,
    groupId
  } = input;

  const {order} = await context.mutations.assignOrderToDeliveryRepresentative(context, {
    shopId: decodeShopOpaqueId(shopId),
    accountId: decodeAccountOpaqueId(accountId),
    orderId: decodeOrderOpaqueId(orderId),
    groupId: decodeGroupOpaqueId(groupId)
  });

  return {
    shopId: encodeShopOpaqueId(order.shopId),
    orderId: encodeOrderOpaqueId(order._id),
    fulfillmentManagerId: encodeAccountOpaqueId(order.fulfillmentManager),
    deliveryRepresentativeId: encodeAccountOpaqueId(order.deliveryRepresentative),
  };
}
