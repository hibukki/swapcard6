/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as calendarFeed from "../calendarFeed.js";
import type * as calendarFeedInternal from "../calendarFeedInternal.js";
import type * as chatRoomMessages from "../chatRoomMessages.js";
import type * as chatRoomUsers from "../chatRoomUsers.js";
import type * as chatRooms from "../chatRooms.js";
import type * as conferenceAttendees from "../conferenceAttendees.js";
import type * as conferenceAttendeesUtils from "../conferenceAttendeesUtils.js";
import type * as conferenceMeetingSpots from "../conferenceMeetingSpots.js";
import type * as conferenceUtils from "../conferenceUtils.js";
import type * as conferences from "../conferences.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as llm from "../llm.js";
import type * as llmRateLimit from "../llmRateLimit.js";
import type * as meetingParticipants from "../meetingParticipants.js";
import type * as meetingParticipantsUtils from "../meetingParticipantsUtils.js";
import type * as meetingUtils from "../meetingUtils.js";
import type * as meetings from "../meetings.js";
import type * as notifications from "../notifications.js";
import type * as seed from "../seed.js";
import type * as testingFunctions from "../testingFunctions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  calendarFeed: typeof calendarFeed;
  calendarFeedInternal: typeof calendarFeedInternal;
  chatRoomMessages: typeof chatRoomMessages;
  chatRoomUsers: typeof chatRoomUsers;
  chatRooms: typeof chatRooms;
  conferenceAttendees: typeof conferenceAttendees;
  conferenceAttendeesUtils: typeof conferenceAttendeesUtils;
  conferenceMeetingSpots: typeof conferenceMeetingSpots;
  conferenceUtils: typeof conferenceUtils;
  conferences: typeof conferences;
  health: typeof health;
  http: typeof http;
  llm: typeof llm;
  llmRateLimit: typeof llmRateLimit;
  meetingParticipants: typeof meetingParticipants;
  meetingParticipantsUtils: typeof meetingParticipantsUtils;
  meetingUtils: typeof meetingUtils;
  meetings: typeof meetings;
  notifications: typeof notifications;
  seed: typeof seed;
  testingFunctions: typeof testingFunctions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
