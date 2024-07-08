import { ComponentSettings, MCEvent } from '@managed-components/types'
import { getRequestBody } from './track'

/**
 * Mapping the standard MC ecommerce API to TikTok event names
 */
const EVENT_NAMES_MAP: { [k: string]: string } = {
  'Order Completed': 'CompletePayment',
  'Product Added': 'AddToCart',
  'Products Searched': 'Search',
  'Checkout Started': 'InitiateCheckout',
  'Payment Info Entered': 'AddPaymentInfo',
  'Product Added to Wishlist': 'AddToWishlist',
  'Product Viewed': 'ViewContent',
}

const getContents = (payload: Record<string, unknown>) => {
  const processProduct = (product: Record<string, unknown>) => {
    const result: Record<string, unknown> = {}

    if (product.quantity || payload.quantity) {
      result.quantity =
        Math.floor(Number(product.quantity || payload.quantity)) || 1
    }

    if (product.price || payload.price) {
      result.price = Number(product.price || payload.price)
    }

    if (
      product.sku ||
      product.product_id ||
      payload.sku ||
      payload.product_id
    ) {
      result.content_id = String(
        product.sku || product.product_id || payload.sku || payload.product_id
      )
    }

    if (product.category || payload.category) {
      result.content_category = String(product.category || payload.category)
    }

    if (product.name || payload.name) {
      result.content_name = String(product.name || payload.name)
    }

    if (product.brand || payload.brand) {
      result.brand = String(product.brand || payload.brand)
    }

    return result
  }

  if (Array.isArray(payload.products)) {
    return payload.products.map((p: Record<string, unknown>) =>
      processProduct(p)
    )
  } else {
    return [processProduct(payload)]
  }
}

const getValue = (payload: Record<string, unknown>) =>
  Number(payload.revenue || payload.total || payload.value || payload.price)

const mapEcommerceData = (event: MCEvent) => {
  const { payload } = event
  const data = payload.ecommerce

  const properties: { [k: string]: any } = {}

  properties.value = getValue(data)
  properties.currency = data.currency
  properties.contents = getContents(data)
  if (properties.contents?.content_id) {
    properties.content_type = 'product'
  }
  if (event.name === 'Products Searched') {
    properties.query = data.query
  }
  properties.order_id = payload.order_id
  return properties
}

export const getEcommerceRequestBody = async (
  event: MCEvent,
  settings: ComponentSettings
) => {
  const ecommerceData = mapEcommerceData(event)
  delete event.payload.ecommerce.products
  const request = await getRequestBody('ecommerce', event, settings)

  request.event = EVENT_NAMES_MAP[event.name || '']
  delete request.properties.eventName

  request.properties = { ...request.properties, ...ecommerceData }

  return request
}
