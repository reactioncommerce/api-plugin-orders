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
 * @name Mutation/assignOrderToFulfillmentManager
 * @method
 * @summary resolver for the assignOrderToFulfillmentManager GraphQL mutation
 * @param {Object} args.input - an object of all mutation arguments that were sent by the client
 * @param {Object} [args.input.shopId] - The shop ID
 * @param {String} [args.input.orderId] - The order ID
 * @param {String} args.input.accountId - ID of fulfillment manager
 * @param {Object} context - an object containing the per-request state
 * @returns {Promise<Object>} AssignOrderToAccountPayload
 */
export default async function assignOrderToFulfillmentManager(parentResult, {input}, context) {
  const {
    shopId,
    orderId,
    accountId,
    groupId
  } = input;

  const {order} = await context.mutations.assignOrderToFulfillmentManager(context, {
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

