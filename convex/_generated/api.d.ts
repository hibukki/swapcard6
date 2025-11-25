/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as conferenceAttendees from "../conferenceAttendees.js";
import type * as conferenceAttendeesUtils from "../conferenceAttendeesUtils.js";
import type * as conferenceUtils from "../conferenceUtils.js";
import type * as conferences from "../conferences.js";
import type * as health from "../health.js";
import type * as meetingParticipants from "../meetingParticipants.js";
import type * as meetingParticipantsUtils from "../meetingParticipantsUtils.js";
import type * as meetingUtils from "../meetingUtils.js";
import type * as meetings from "../meetings.js";
import type * as notifications from "../notifications.js";
import type * as seed from "../seed.js";
import type * as testingFunctions from "../testingFunctions.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  conferenceAttendees: typeof conferenceAttendees;
  conferenceAttendeesUtils: typeof conferenceAttendeesUtils;
  conferenceUtils: typeof conferenceUtils;
  conferences: typeof conferences;
  health: typeof health;
  meetingParticipants: typeof meetingParticipants;
  meetingParticipantsUtils: typeof meetingParticipantsUtils;
  meetingUtils: typeof meetingUtils;
  meetings: typeof meetings;
  notifications: typeof notifications;
  seed: typeof seed;
  testingFunctions: typeof testingFunctions;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
