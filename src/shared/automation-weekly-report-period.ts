function getLocalWeeklyReportPeriodStart(scheduledFor: number): number {
  const start = new Date(scheduledFor)
  start.setHours(0, 0, 0, 0)
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)
  return start.getTime()
}

function getZonedDateParts(timestamp: number, timezone: string): [number, number, number] {
  const values = new Map(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })
      .formatToParts(timestamp)
      .map((part) => [part.type, Number(part.value)])
  )
  const year = values.get('year')
  const month = values.get('month')
  const day = values.get('day')
  if (!year || !month || !day) {
    throw new Error('invalid_timezone_date')
  }
  return [year, month, day]
}

function zonedMidnightToTimestamp(
  year: number,
  month: number,
  day: number,
  timezone: string
): number {
  const targetAsUtc = Date.UTC(year, month - 1, day)
  let timestamp = targetAsUtc
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23'
  })
  // Why: the schedule timezone can differ from the desktop/serve host and its
  // UTC offset can change with DST, so converge on wall-clock midnight.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const values = new Map(
      formatter.formatToParts(timestamp).map((part) => [part.type, Number(part.value)])
    )
    const representedAsUtc = Date.UTC(
      values.get('year') ?? 0,
      (values.get('month') ?? 1) - 1,
      values.get('day') ?? 1,
      values.get('hour') ?? 0,
      values.get('minute') ?? 0,
      values.get('second') ?? 0
    )
    const correction = targetAsUtc - representedAsUtc
    timestamp += correction
    if (correction === 0) {
      break
    }
  }
  return timestamp
}

export function getWeeklyReportPeriodStart(scheduledFor: number, timezone?: string): number {
  if (!timezone) {
    return getLocalWeeklyReportPeriodStart(scheduledFor)
  }
  try {
    const [year, month, day] = getZonedDateParts(scheduledFor, timezone)
    const localCalendarDate = new Date(Date.UTC(year, month - 1, day))
    const daysSinceMonday = (localCalendarDate.getUTCDay() + 6) % 7
    localCalendarDate.setUTCDate(localCalendarDate.getUTCDate() - daysSinceMonday)
    return zonedMidnightToTimestamp(
      localCalendarDate.getUTCFullYear(),
      localCalendarDate.getUTCMonth() + 1,
      localCalendarDate.getUTCDate(),
      timezone
    )
  } catch {
    // Why: legacy or externally edited automation data can contain an invalid
    // timezone; falling back keeps the report runnable on every host.
    return getLocalWeeklyReportPeriodStart(scheduledFor)
  }
}
