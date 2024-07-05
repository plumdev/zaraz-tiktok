import { ComponentSettings, Manager } from '@managed-components/types'
import { getEcommerceRequestBody } from './ecommerce'
import { getRequestBody } from './track'

const sendEvent = async (
  payload: Record<string, any>,
  manager: Manager,
  settings: ComponentSettings
) => {
  const tiktokEndpoint =
    'https://business-api.tiktok.com/open_api/v1.3/event/track/'

  const requestBody = {
    event_source: payload.event_source || 'web',
    event_source_id: payload.properties.pixelCode || settings.pixelCode,
    ...(settings.testKey && { test_event_code: settings.testKey }),
    data: [
      {
        ...payload,
      },
    ],
  }
  try {
    const response = await manager.fetch(tiktokEndpoint, {
      method: 'POST',
      headers: {
        'Access-Token': payload.properties.accessToken || settings.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response) {
      throw new Error('No response from Tiktok fetch request')
    }

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(
        'Error sending TikTok fetch request: ',
        responseData.message || 'Error sending TikTok fetch request'
      )
    }
  } catch (error) {
    console.error('Error sending TikTok fetch request:', error)
  }
}

export default async function (manager: Manager, settings: ComponentSettings) {
  manager.addEventListener('event', async event => {
    const request = await getRequestBody('event', event, settings)
    sendEvent(request, manager, settings)
  })

  manager.addEventListener('custom-event', async event => {
    const request = await getRequestBody('event', event, settings)
    sendEvent(request, manager, settings)
  })

  manager.addEventListener('pageview', async event => {
    const request = await getRequestBody('pageview', event, settings)
    sendEvent(request, manager, settings)
  })

  manager.addEventListener('ecommerce', async event => {
    const request = await getEcommerceRequestBody(event, settings)
    sendEvent(request, manager, settings)
  })
}
