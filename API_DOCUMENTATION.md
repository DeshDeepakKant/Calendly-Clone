# API Documentation

Base URL: `http://localhost:4000` (development) or your deployed backend URL

## Authentication

No authentication required. The application uses a hardcoded admin user (ID: 1) for all operations.

## Endpoints

### Event Types

#### List Event Types
```
GET /api/event-types
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "30 Minute Meeting",
    "duration": 30,
    "urlSlug": "30-min-meeting",
    "description": "A quick 30-minute meeting",
    "color": "#006BFF",
    "userId": 1,
    "scheduleId": 1,
    "bufferBefore": 0,
    "bufferAfter": 0,
    "createdAt": "2026-01-08T10:00:00.000Z"
  }
]
```

#### Get Event Type by Slug
```
GET /api/event-types/:slug
```

**Response:**
```json
{
  "id": 1,
  "title": "30 Minute Meeting",
  "duration": 30,
  "urlSlug": "30-min-meeting",
  "description": "A quick meeting",
  "color": "#006BFF",
  "user": {
    "username": "admin",
    "timeZone": "Asia/Kolkata"
  },
  "customQuestions": []
}
```

#### Create Event Type
```
POST /api/event-types
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "15 Min Call",
  "duration": 15,
  "urlSlug": "15-min-call",
  "description": "Quick call",
  "color": "#FF5733",
  "scheduleId": 1,
  "bufferBefore": 5,
  "bufferAfter": 5,
  "customQuestions": [
    {
      "label": "Phone Number",
      "type": "phone",
      "required": true,
      "placeholder": "+1234567890"
    }
  ]
}
```

**Response:** 201 Created with event type object

**Errors:**
- 400: Missing required fields
- 409: URL slug already exists

#### Update Event Type
```
PUT /api/event-types/:id
Content-Type: application/json
```

**Request Body:** Same as create (all fields optional except ID in URL)

**Response:** 200 OK with updated event type

**Errors:**
- 404: Event type not found
- 409: URL slug conflict

#### Delete Event Type
```
DELETE /api/event-types/:id
```

**Response:** 200 OK
```json
{
  "message": "Event type deleted successfully"
}
```

**Errors:**
- 404: Event type not found

### Availability

#### Get Availability
```
GET /api/availability
```

**Response:**
```json
{
  "availabilities": [
    {
      "id": 1,
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00",
      "scheduleId": 1
    }
  ],
  "timeZone": "Asia/Kolkata"
}
```

#### Update Availability
```
PUT /api/availability
Content-Type: application/json
```

**Request Body:**
```json
{
  "availabilities": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ],
  "timeZone": "Asia/Kolkata"
}
```

**Response:** 200 OK with updated availabilities

**Errors:**
- 400: Invalid dayOfWeek (must be 0-6) or time format (must be HH:MM)

### Availability Schedules

#### List Schedules
```
GET /api/availability-schedules
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Default Schedule",
    "isDefault": true,
    "userId": 1,
    "availabilities": [...],
    "_count": {
      "eventTypes": 2
    }
  }
]
```

#### Create Schedule
```
POST /api/availability-schedules
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Weekend Schedule",
  "isDefault": false,
  "availabilities": [
    {
      "dayOfWeek": 6,
      "startTime": "10:00",
      "endTime": "14:00"
    }
  ]
}
```

**Response:** 201 Created

#### Update Schedule
```
PUT /api/availability-schedules/:id
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "availabilities": [...]
}
```

**Response:** 200 OK

#### Delete Schedule
```
DELETE /api/availability-schedules/:id
```

**Response:** 200 OK

**Errors:**
- 400: Cannot delete if assigned to event types or if it's the only schedule
- 404: Schedule not found

#### Set Default Schedule
```
PATCH /api/availability-schedules/:id/set-default
```

**Response:** 200 OK with updated schedule

### Bookings

#### Get Available Slots
```
GET /api/slots?date=2026-01-15&slug=30-min-meeting
```

**Query Parameters:**
- `date`: YYYY-MM-DD format
- `slug`: Event type URL slug

**Response:**
```json
{
  "slots": [
    {
      "startTime": "2026-01-15T09:00:00.000Z",
      "endTime": "2026-01-15T09:30:00.000Z",
      "displayTime": "9:00 AM"
    }
  ]
}
```

**Errors:**
- 400: Missing date or slug
- 404: Event type not found

#### Create Booking
```
POST /api/bookings
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventTypeId": 1,
  "inviteeName": "John Doe",
  "inviteeEmail": "john@example.com",
  "startTime": "2026-01-15T09:00:00.000Z",
  "endTime": "2026-01-15T09:30:00.000Z",
  "customAnswers": {
    "1": "+1234567890"
  }
}
```

**Response:** 201 Created with booking object

**Errors:**
- 400: Missing required fields
- 409: Time slot no longer available (conflict with confirmed booking)

#### Get Booking
```
GET /api/bookings/:id
```

**Response:** 200 OK with booking object

**Errors:**
- 404: Booking not found

#### Reschedule Booking
```
PATCH /api/bookings/:id/reschedule
Content-Type: application/json
```

**Request Body:**
```json
{
  "startTime": "2026-01-15T10:00:00.000Z",
  "endTime": "2026-01-15T10:30:00.000Z"
}
```

**Response:** 200 OK with updated booking

**Errors:**
- 400: Can only reschedule confirmed bookings
- 404: Booking not found
- 409: New time slot not available

### Meetings

#### List Meetings
```
GET /api/meetings?type=upcoming
```

**Query Parameters:**
- `type`: `upcoming` or `past` (default: `upcoming`)

**Response:**
```json
[
  {
    "id": 1,
    "inviteeName": "John Doe",
    "inviteeEmail": "john@example.com",
    "startTime": "2026-01-15T09:00:00.000Z",
    "endTime": "2026-01-15T09:30:00.000Z",
    "status": "CONFIRMED",
    "eventType": {
      "id": 1,
      "title": "30 Minute Meeting",
      "duration": 30,
      "color": "#006BFF"
    }
  }
]
```

#### Cancel Meeting
```
PATCH /api/meetings/:id/cancel
```

**Response:** 200 OK with updated booking (status: CANCELLED)

**Errors:**
- 400: Booking already cancelled
- 404: Booking not found

### Schedule Overrides

#### Get Overrides
```
GET /api/schedules/:id/overrides
```

**Response:**
```json
[
  {
    "id": 1,
    "scheduleId": 1,
    "date": "2026-01-20T00:00:00.000Z",
    "startTime": "10:00",
    "endTime": "15:00",
    "isUnavailable": false
  }
]
```

#### Create/Update Override
```
POST /api/schedules/:id/overrides
Content-Type: application/json
```

**Request Body:**
```json
{
  "date": "2026-01-20",
  "startTime": "10:00",
  "endTime": "15:00",
  "isUnavailable": false
}
```

**Response:** 200 OK with override object

#### Delete Override
```
DELETE /api/schedules/:id/overrides/:date
```

**Response:** 200 OK

## Error Responses

All error responses follow this format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- 400: Bad Request (validation error)
- 404: Not Found
- 409: Conflict (duplicate or booking conflict)
- 500: Internal Server Error

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Day of week: 0 = Sunday, 6 = Saturday
- Time format for availability: HH:MM (24-hour)
- Booking status: CONFIRMED or CANCELLED
- Only CONFIRMED bookings block time slots
