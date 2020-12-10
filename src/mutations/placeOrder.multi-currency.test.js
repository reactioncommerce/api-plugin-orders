import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import Factory from "../tests/factory.js";
import placeOrder from "./placeOrder.js";

beforeEach(() => {
  jest.resetAllMocks();
  mockContext.getFunctionsOfType.mockReturnValue([]);
});

const accountId = "accountId";
const cartId = "cartId";
const shopId = "shopId";
const cart = {
  _id: cartId,
  items: []
}

const discount = {
  _id : "discount",
  currencyCode: "USD",
}

function queryMockReturnValueOnce(name, value) {
  mockContext.queries[name] = jest.fn().mockName(name);
  mockContext.queries[name].mockReturnValueOnce(value)
}

function queryMockFn(name, fn) {
  mockContext.queries[name] = jest.fn().mockName(name);
  mockContext.queries[name].mockImplementation(fn)
}

async function getVariantPrice(context, catalogVariant, currencyCode) {
  if (!currencyCode) throw new Error("getVariantPrice received no currency code");
  if (!catalogVariant) throw new Error("getVariantPrice received no catalogVariant");
  if (!catalogVariant.pricing) throw new Error(`Catalog variant ${catalogVariant._id} has no pricing information saved`);
  return catalogVariant.pricing[currencyCode] || computeVariantPrice(context, catalogVariant, currencyCode);
}
const exchangeRate = 4
async function computeVariantPrice(context, {currencyCode: catalogCurrencyCode, pricing, shopId}, currencyCode) {
  const shop = await context.queries.shopById(context, shopId)
  catalogCurrencyCode = catalogCurrencyCode || shop.currency;
  let nativePricing = pricing[catalogCurrencyCode];
  const forex = exchangeRate;
  if(!nativePricing) {
    return {};
  }

  let {minPrice, maxPrice, price} = nativePricing;
  if(!forex) {
    return {
      minPrice, maxPrice, price, currencyCode: catalogCurrencyCode  
    }
  }

  return {
    minPrice: minPrice && (forex * minPrice),
    maxPrice: maxPrice && (forex * maxPrice),
    price: price && (forex * price),
    currencyCode
  }
}


test("find one cart", async () => {
  mockContext.collections.Cart.findOne.mockReturnValueOnce(Promise.resolve(cart));

  const selectedFulfillmentMethodId = "METHOD_ID";
  const selectedFulfillmentMethod = {
    _id: selectedFulfillmentMethodId,
    carrier: "CARRIER",
    label: "LABEL",
    name: "METHOD1"
  };
  const catalogProduct = Factory.CatalogProduct.makeOne();
  const catalogProductVariant = {...Factory.CatalogProductVariant.makeOne(), pricing: {
    "USD": {
      currencyCode: "USD",
      price: 10
    }
  },
  currencyCode: "USD"
};
const getPrettyPrice = price => {
  let integer = Math.floor(price);
  let decimal = parseFloat((price % 1).toPrecision(3));

  if(decimal === 0) {
    integer -= 1;
    decimal = 0.99;
  } else if(decimal < 0.5) {
    decimal = 0.49;
  } else {
    decimal = 0.99;
  }

  return integer + decimal;
}

  queryMockReturnValueOnce("getForexFor", 4);
  queryMockFn("getExchangedPrice", (amount, currencyCode) => {
    let exchangeRate = 4;
    return getPrettyPrice(exchangeRate * amount)
  }
)
  queryMockReturnValueOnce("getPaymentMethodConfigByName", {
    functions: {
      listRefunds: async () => [{
        _id: "refundId",
        type: "refund",
        amount: 19.99,
        currency: "usd"
      }],
      createAuthorizedPayment: async (ctx, order) => {
        const {amount, currencyCode, shopId } = order;
        return {
          _id: 'p1',
          amount,
          currencyCode,
          createdAt: new Date(),
          displayName: "Payment ",
          method: "method 1",
          mode: "cash",
          name:"p1",
          shopId, 
          paymentPluginName: "p1",
          "processor": "String",
          "status": "st",
          "transactionId": "t1",
          "transactions": [{
            amount,
          }]
        }
      }
    }});

    queryMockReturnValueOnce("findProductAndVariant", {
      catalogProduct,
      variant: catalogProductVariant
    });

    queryMockReturnValueOnce("getDiscountsTotalForCart", {total: 1, discounts: []})
    queryMockFn("getVariantPrice", getVariantPrice)

  mockContext.queries.inventoryForProductConfiguration = jest.fn().mockName("inventoryForProductConfiguration");
  mockContext.queries.inventoryForProductConfiguration.mockReturnValueOnce({
    canBackorder: true,
    inventoryAvailableToSell: 10
  });

  mockContext.queries.getFulfillmentMethodsWithQuotes = jest.fn().mockName("getFulfillmentMethodsWithQuotes");
  mockContext.queries.getFulfillmentMethodsWithQuotes.mockReturnValueOnce([{
    method: selectedFulfillmentMethod,
    handlingPrice: 5,
    shippingPrice: 0,
    rate: 0
  }]);

  mockContext.queries.shopById = jest.fn().mockName("shopById");
  mockContext.queries.shopById.mockReturnValueOnce({
    _id: shopId,
    availablePaymentMethods: ["PAYMENT1"],
    currencyCode: "USD",
  });
  const orderInput = Factory.orderInputSchema.makeOne({
    cartId,
    currencyCode: "NPR",
    email: "valid@email.address",
    ordererPreferredLanguage: "en",
    fulfillmentGroups: Factory.orderFulfillmentGroupInputSchema.makeMany(1, {
      data: {shippingAddress: {
        address1: "",
        fullName: "sdf",
        city: " ",
        phone: " ", 
        region:"",
        postal: "",
        country: "",
        isCommercial: false,
        
      }},
      items: Factory.orderItemInputSchema.makeMany(1, {
        quantity: 1,
        price: 40,
        currencyCode: "USD",
      }),
      selectedFulfillmentMethodId,
      totalPrice: 45
    })
  });

  const { orders, token } = await placeOrder(mockContext, {
    order: orderInput,
    payments : [
      {
        amount: 41.0,
        method: 'PAYMENT1',
        _id: "payment1",
        transactionId: "t1",
      }
    ],
  });

  const [order] = orders;

  expect(order).toEqual({
    _id: jasmine.any(String),
    createdAt: jasmine.any(Date),
    currencyCode: orderInput.currencyCode,
    customFields: {},
    email: orderInput.email,
    ordererPreferredLanguage: "en",
    referenceId: jasmine.any(String),
    shipping: [
      {
        _id: jasmine.any(String),
        invoice: {
          currencyCode: orderInput.currencyCode,
          discounts: 3.99,
          effectiveTaxRate: 0,
          shipping: 5,
          subtotal: 40,
          surcharges: 0,
          taxableAmount: 0,
          taxes: 0,
          total: 41.0
        },
        itemIds: [order.shipping[0].items[0]._id],
        items: [
          {
            _id: jasmine.any(String),
            addedAt: jasmine.any(Date),
            attributes: [
              {
                label: "mockAttributeLabel",
                value: "mockOptionTitle"
              }
            ],
            createdAt: jasmine.any(Date),
            optionTitle: catalogProductVariant.optionTitle,
            price: {
              amount: 40,
              currencyCode: orderInput.currencyCode
            },
            productId: catalogProduct.productId,
            productSlug: catalogProduct.slug,
            productTagIds: catalogProduct.tagIds,
            productType: catalogProduct.type,
            productVendor: catalogProduct.vendor,
            quantity: 1,
            shopId: catalogProduct.shopId,
            subtotal: 40,
            title: catalogProduct.title,
            updatedAt: jasmine.any(Date),
            variantId: catalogProductVariant.variantId,
            variantTitle: catalogProductVariant.title,
            workflow: {
              status: "new",
              workflow: [
                "coreOrderWorkflow/created",
                "coreItemWorkflow/removedFromInventoryAvailableToSell"
              ]
            }
          }
        ],
        shipmentMethod: {
          ...selectedFulfillmentMethod,
          currencyCode: orderInput.currencyCode,
          handling: 5,
          rate: 0
        },
        shopId: orderInput.shopId,
        totalItemQuantity: 1,
        type: "shipping",
        workflow: {
          status: "new",
          workflow: [
            "new"
          ]
        }
      }
    ],
    shopId: orderInput.shopId,
    surcharges: [],
    totalItemQuantity: 1,
    updatedAt: jasmine.any(Date),
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  });

  expect(token).toEqual(jasmine.any(String));
})
