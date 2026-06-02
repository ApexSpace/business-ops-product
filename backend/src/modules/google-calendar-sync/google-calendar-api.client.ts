import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-code.enum';
import { GOOGLE_CALENDAR_API_BASE } from './google-calendar-sync.constants';
import type {
  GoogleCalendarEvent,
  GoogleCalendarEventsListResponse,
} from './google-calendar-sync.types';

export interface GoogleEventPayload {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

@Injectable()
export class GoogleCalendarApiClient {
  async listEvents(
    accessToken: string,
    calendarId: string,
    options: { timeMin: string; timeMax: string; pageToken?: string },
  ): Promise<GoogleCalendarEventsListResponse> {
    const params = new URLSearchParams({
      timeMin: options.timeMin,
      timeMax: options.timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });
    if (options.pageToken) {
      params.set('pageToken', options.pageToken);
    }

    const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw await this.toApiError(response);
    }

    return (await response.json()) as GoogleCalendarEventsListResponse;
  }

  async createEvent(
    accessToken: string,
    calendarId: string,
    payload: GoogleEventPayload,
  ): Promise<GoogleCalendarEvent> {
    const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw await this.toApiError(response);
    }

    return (await response.json()) as GoogleCalendarEvent;
  }

  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    payload: GoogleEventPayload,
  ): Promise<GoogleCalendarEvent> {
    const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw await this.toApiError(response);
    }

    return (await response.json()) as GoogleCalendarEvent;
  }

  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
  ): Promise<void> {
    const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 404 || response.status === 410) {
      return;
    }

    if (!response.ok) {
      throw await this.toApiError(response);
    }
  }

  private async toApiError(response: Response): Promise<AppException> {
    const detail = await response.text();
    const message =
      detail.length > 0
        ? `Google Calendar API error (${response.status}): ${detail.slice(0, 500)}`
        : `Google Calendar API error (${response.status})`;

    return new AppException(
      ErrorCode.BAD_REQUEST,
      message,
      response.status === 401 || response.status === 403
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.BAD_GATEWAY,
    );
  }
}
