import type { API_PostLibiioBoardList } from "@/pages/device/services/typings/device"

export type StatusTone = "normal" | "abnormal" | "none"

export const toFiniteNumberOrNull = (value?: number | string | null) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === "string" && value.trim()) {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : null
  }
  return null
}

export const isAlarmEnabled = (value?: number | string | boolean | null) =>
  value === true || value === 1 || value === "1" || value === "true"

const getRangeStatus = (
  enabled?: number | string | boolean | null,
  value?: number | string | null,
  min?: number | string | null,
  max?: number | string | null,
  alarmFlag?: number | string | boolean | null,
): StatusTone => {
  const numberValue = toFiniteNumberOrNull(value)
  const minValue = toFiniteNumberOrNull(min)
  const maxValue = toFiniteNumberOrNull(max)
  if (
    !isAlarmEnabled(enabled) ||
    numberValue === null ||
    (minValue === null && maxValue === null)
  ) {
    return "none"
  }
  const isAbnormal =
    alarmFlag !== undefined && alarmFlag !== null
      ? isAlarmEnabled(alarmFlag)
      : (minValue !== null && numberValue < minValue) ||
        (maxValue !== null && numberValue > maxValue)
  return isAbnormal ? "abnormal" : "normal"
}

export const getDeviceVswrStatus = (device: API_PostLibiioBoardList.List): StatusTone =>
  getRangeStatus(
    device.tx_vswr_alarm_enabled,
    device.tx_vswr,
    device.tx_vswr_alarm_min,
    device.tx_vswr_alarm_max,
    device.tx_vswr_is_alarm,
  )

export const getChannelAlarmStates = (
  channel: API_PostLibiioBoardList.Channel,
  direction: "rx" | "tx",
  device: API_PostLibiioBoardList.List,
): { primary: StatusTone; rssi: StatusTone; vswr: StatusTone } => {
  if (channel.is_maintaining || !channel.configured) {
    return { primary: "none", rssi: "none", vswr: "none" }
  }
  return {
    primary: getRangeStatus(
      channel.alarm_enabled ?? channel.is_alarm,
      direction === "tx"
        ? channel.power_w ?? channel.metric_value
        : channel.rssi_dbm ?? channel.metric_value,
      channel.min,
      channel.max,
    ),
    rssi:
      direction === "tx"
        ? getRangeStatus(
            channel.rssi_is_alarm,
            channel.rssi_dbm ?? channel.metric_value,
            channel.rssi_min,
            channel.rssi_max,
          )
        : "none",
    vswr: direction === "tx" ? getDeviceVswrStatus(device) : "none",
  }
}

export const getChannelStatusTone = (
  channel: API_PostLibiioBoardList.Channel,
  direction: "rx" | "tx",
  device: API_PostLibiioBoardList.List,
): StatusTone => {
  const states = Object.values(getChannelAlarmStates(channel, direction, device))
  if (states.includes("abnormal")) {
    return "abnormal"
  }
  return states.includes("normal") ? "normal" : "none"
}
