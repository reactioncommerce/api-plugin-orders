import Logger from "@reactioncommerce/logger";
import sendOrderEmail from "./util/sendOrderEmail.js";

/**
 * @summary Extend the schema with updated allowedValues
 * @param {Object} context Startup context
 * @returns {undefined}
 */
async function extendSchemas(context) {
  let allFulfillmentTypesArray = await context.queries.allFulfillmentTypes(context);

  if (!allFulfillmentTypesArray || allFulfillmentTypesArray.length === 0) {
    Logger.warn("No fulfillment types available, setting 'shipping' as default");
    allFulfillmentTypesArray = ["shipping"];
  }

  const { simpleSchemas: { CommonOrder, OrderFulfillmentGroup, orderFulfillmentGroupInputSchema } } = context;
  const schemaExtension = {
    type: {
      allowedValues: allFulfillmentTypesArray
    }
  };
  const schemaExtensionCommonOrder = {
    fulfillmentType: {
      allowedValues: allFulfillmentTypesArray
    }
  };
  CommonOrder.extend(schemaExtensionCommonOrder);
  orderFulfillmentGroupInputSchema.extend(schemaExtension);
  OrderFulfillmentGroup.extend(schemaExtension);
}

/**
 * @summary Called on startup
 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 * @returns {undefined}
 */
export default async function ordersStartup(context) {
  const { appEvents } = context;

  await extendSchemas(context);

  appEvents.on("afterOrderCreate", ({ order }) => sendOrderEmail(context, order));
}
