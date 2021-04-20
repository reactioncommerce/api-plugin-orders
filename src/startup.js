import sendOrderEmail from "./util/sendOrderEmail.js";

/**
 * @summary Called on startup
 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 * @returns {undefined}
 */
let support_email = process.env["ORDER_NOTIFY_EMAIL"];
export default async function ordersStartup(context) {
  const { appEvents } = context;

  if(!support_email) {
    const primaryShop = await context.queries.primaryShop(context.getInternalContext());
    if (primaryShop && primaryShop.emails && primaryShop.emails.length > 0) {
      support_email = primaryShop.emails[0].address || ''
    }
  }
  console.log("Using support email: ", support_email)
  appEvents.on(
    "afterOrderCreate",
    ({ order }) => sendEmail(context, order),
  );
  appEvents.on("afterOrderUpdate", ({ order }) => updated(context, order));
  appEvents.on("afterOrderCancel", ({ order }) => sendOrderEmail(context, order, 'canceled'));
}

function sendEmail(context, order) {
  if(order.deliveryUrgency === "As soon as possible") {
    order = {
      ...order,
      preferredDeliveryDate: "As soon as possible"
    }
  }
  sendOrderEmail(context, order);
  if (support_email) {
    sendOrderEmail(context, Object.assign({}, order, { email: support_email }), "new-admin");
  }
}

const emailActions = ["shipped", "completed"]
function updated(context, order) {
  if (!emailActions.includes(order.action)) {
    return;
  }
  sendOrderEmail(context, order, order.action);
}
