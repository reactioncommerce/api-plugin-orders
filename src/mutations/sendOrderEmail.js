import SimpleSchema from "simpl-schema";

const inputSchema = new SimpleSchema({
  action: {
    type: String,
    optional: true
  },
  fromShop: {
    type: Object,
    blackbox: true
  },
  to: {
    type: String
  },
  language: {
    type: String,
    optional: true
  },
  dataForEmail: {
    type: Object,
    blackbox: true
  },
  after: {
    type: Date,
    optional: true,
  },
  templateName: {
    type: String,
    optional: true,
  },
});

/**
 * @name sendOrderEmail
 * @summary A mutation that compiles and server-side renders the email template with order data, and sends the email
 * @param {Object} context GraphQL context
 * @param {Object} input Data for email: action, dataForEmail, fromShop, to
 * @returns {Undefined} no return
 */
export default async function sendOrderEmail(context, input) {
  inputSchema.validate(input);
  const { action, dataForEmail, fromShop, language, to, after, templateName} = input;

  await context.mutations.sendEmail(context, {
    data: dataForEmail,
    fromShop,
    templateName: templateName? templateName : getTemplateName(action, dataForEmail),
    language,
    to,
    after,
  });
}

function getTemplateName(action, dataForEmail) {
  if (action === "shipped") {
    return "orders/shipped";
  } else if (action === "refunded") {
    return "orders/refunded";
  } else if (action === "itemRefund") {
    return "orders/itemRefund";
  } else if (action === "completed") {
    return "orders/completed";
  } else if (action === "new-admin") {
    return "orders/new-admin";
  } else if (action === "canceled") {
    return"orders/canceled";
  } else {
    return `orders/${dataForEmail.order.workflow.status}`;
  }
}