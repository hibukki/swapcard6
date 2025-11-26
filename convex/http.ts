import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  pathPrefix: "/calendar/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const token = pathParts[pathParts.length - 1];

    if (!token) {
      return new Response("Missing calendar token", { status: 400 });
    }

    const baseUrl = process.env.SITE_URL;

    const result = await ctx.runQuery(internal.calendarFeedInternal.getCalendarFeed, {
      token,
      baseUrl,
    });

    if (!result) {
      return new Response("Invalid calendar token", { status: 404 });
    }

    return new Response(result.icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="swapcard.ics"',
      },
    });
  }),
});

export default http;
