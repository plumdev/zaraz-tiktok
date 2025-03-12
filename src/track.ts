import { ComponentSettings, MCEvent } from '@managed-components/types'

const USER_DATA: Record<string, { ttKey: string; hashed?: boolean }> = {
  email: { ttKey: 'email', hashed: true },
  phone: { ttKey: 'phone', hashed: true },
  id: { ttKey: 'external_id', hashed: true },
  ttp: { ttKey: 'ttp', hashed: false },
  ttclid: { ttKey: 'ttclid', hashed: false },
  locale: { ttKey: 'locale', hashed: false },
}

const getTtclid = (event: MCEvent) => {
  const { client } = event
  let ttclid = client.get('ttclid') || ''

  if (client.url.searchParams?.get('ttclid')) {
    ttclid = client.url.searchParams.get('ttclid') ?? ''
    client.set('ttclid', ttclid)
  }
  return ttclid
}

const getBaseRequestBody = (
  eventType: string,
  event: MCEvent,
  settings: ComponentSettings
) => {
  const { client, payload } = event
  const eventId =
    payload.event_id || String(Math.round(Math.random() * 100000000000000000))

  const body: { [k: string]: any } = {
    event:
      (eventType === 'pageview' ? 'ViewContent' : payload.ev) ||
      payload.cev ||
      event.name ||
      event.type,
    event_id: eventId,
    event_time: Math.floor(Date.now() / 1000),
    user: {
      ...(!settings.hideClientIP && {
        user_agent: client.userAgent,
        ip: client.ip,
      }),
    },
    page: {
      url: client.url.href,
      referrer: client.referer || '',
    },
    properties: {},
    limited_data_use: payload.ldu,
  }
  delete payload.ev

  return body
}

export const getRequestBody = async (
  eventType: string,
  event: MCEvent,
  settings: ComponentSettings
) => {
  let payload
  if (eventType === 'ecommerce') {
    payload = event.payload.ecommerce
  } else {
    payload = event.payload
  }
  const ttclid = getTtclid(event)
  const body = getBaseRequestBody(eventType, event, settings)

  if (ttclid) {
    payload.ttclid = ttclid
  }

  // appending hashed user data
  const userData = { ...payload.user, ...payload.user?.tiktok }
  delete payload.user

  const encoder = new TextEncoder()
  for (const [key, { ttKey, hashed }] of Object.entries(USER_DATA)) {
    let value = userData[key]
    if (value) {
      if (hashed) {
        const data = encoder.encode(value.trim().toLowerCase())
        const digest = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(digest))
        value = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      }
      body.user[ttKey] = value
      // backward compatibility for 'phone_number' (from event api v1)
      if (body.user.phone_number) {
        body.user.phone = body.user.phone_number
        delete body.user.phone_number
      }
      delete payload[key]
    }
  }

  return body
}
