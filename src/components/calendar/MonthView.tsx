import {
  type CalendarMeetingView,
  type CalendarUser,
  type CalendarParticipantsMap,
  categoryStyles,
  getEventTooltip,
  getEventDisplayTitle,
} from "@/types/calendar";

export interface MonthViewProps {
  meetings: CalendarMeetingView[];
  currentDate: Date;
  usersMap: Map<string, CalendarUser>;
  participantUserIds: CalendarParticipantsMap;
  onMeetingClick: (meeting: CalendarMeetingView) => void;
}

export function MonthView({
  meetings,
  currentDate,
  usersMap,
  participantUserIds,
  onMeetingClick,
}: MonthViewProps) {
  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex-1 overflow-auto border border-border rounded-lg">
      <div className="grid grid-cols-7 h-full">
        {weekDays.map((day) => (
          <div
            key={day}
            className="sticky top-0 bg-muted border-b border-r border-border p-2 text-center text-sm font-semibold z-10"
          >
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="border-r border-b border-border bg-muted/30 min-h-[100px]"
              />
            );
          }

          const date = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            day
          );
          const isToday = date.toDateString() === new Date().toDateString();

          const dayMeetings = meetings.filter((calendarMeeting) => {
            const meetingDate = new Date(calendarMeeting.meeting.scheduledTime);
            return meetingDate.toDateString() === date.toDateString();
          });

          return (
            <div
              key={day}
              className="border-r border-b border-border p-2 min-h-[100px] hover:bg-muted/50 transition-colors"
            >
              <div
                className={`text-sm mb-1 ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-bold" : ""}`}
              >
                {day}
              </div>
              <div className="space-y-1">
                {dayMeetings.slice(0, 3).map((calendarMeeting) => {
                  const styles = categoryStyles[calendarMeeting.display.category];
                  const displayTitle = getEventDisplayTitle(
                    calendarMeeting,
                    usersMap,
                    participantUserIds
                  );
                  const tooltip = getEventTooltip(
                    calendarMeeting,
                    usersMap.get(calendarMeeting.meeting.creatorId)?.name
                  );

                  return (
                    <div
                      key={calendarMeeting.meeting._id}
                      className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity border-l-4 ${styles.border} ${styles.borderOnly ? "bg-background" : styles.bg} ${styles.text} ${styles.strikethrough ? "line-through" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMeetingClick(calendarMeeting);
                      }}
                      title={tooltip}
                    >
                      {styles.warningIcon && "⚠️ "}
                      {new Date(calendarMeeting.meeting.scheduledTime).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )}{" "}
                      {displayTitle}
                    </div>
                  );
                })}
                {dayMeetings.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayMeetings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
