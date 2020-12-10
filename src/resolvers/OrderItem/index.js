import resolveShopFromShopId from "@reactioncommerce/api-utils/graphql/resolveShopFromShopId.js";
import { encodeOrderItemOpaqueId } from "../../xforms/id.js";
import productTags from "./productTags.js";

const rootUrl = process.env.ROOT_URL;

function getImage(node) {
  if(node.imageURLs) {
    const {large, medium, small, original, thumbnail} = node.imageURLs;
    return {
      large: rootUrl + large,
      medium: rootUrl + medium,
      small: rootUrl + small,
      original: rootUrl + original,
      thumbnail: rootUrl + thumbnail,
    }
  }
  return {}
}

export default {
  _id: (node) => encodeOrderItemOpaqueId(node._id),
  productTags,
  shop: resolveShopFromShopId,
  imageURLs: getImage,
  status: (node) => node.workflow.status
};
