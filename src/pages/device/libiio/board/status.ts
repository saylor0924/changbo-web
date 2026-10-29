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

export const getStatusTone = (status?: string | null): StatusTone => {
  switch (status) {
    case "normal":
    case "abnormal":
      return status
    default:
      return "none"
  }
}

export const getChannelStatusTone = (channel: API_PostLibiioBoardList.Channel): StatusTone =>
  getStatusTone(channel.status)

export const getDeviceVswrStatus = (device: API_PostLibiioBoardList.List): StatusTone =>
  getStatusTone(device.tx_vswr_status)
