import { PageContainer } from "@ant-design/pro-components"
import { Card, Empty, Spin } from "antd"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useIntl } from "umi"
import Services from "@/pages/device/services"
import type { API_PostLibiioBoardList } from "@/pages/device/services/typings/device"
import {
  getChannelStatusTone,
  getDeviceVswrStatus,
  getStatusTone,
  toFiniteNumberOrNull,
} from "./status"
import type { StatusTone } from "./status"
import "./index.less"

type ModuleDirection = "rx" | "tx"
type BoardDevice = API_PostLibiioBoardList.List
type BoardModule = API_PostLibiioBoardList.Module
type BoardChannel = API_PostLibiioBoardList.Channel
type BoardSection = {
  key: string
  device: BoardDevice
  direction: ModuleDirection
  directionLabel: string
  moduleIp?: string
  isOffline: boolean
  chunks: FrequencyChunk<BoardChannel>[]
}
type BoardPanel = {
  key: string
  device: BoardDevice
  sections: BoardSection[]
  derivedMetricRows: DerivedMetricRow[]
  alarmRows: AlarmRow[]
}

const CHANNELS_PER_ROW = 10
const CHANNEL_COLUMNS = Array.from({ length: CHANNELS_PER_ROW }, (_, index) => index + 1)
const MAX_CHANNEL_COUNT = 20
const BOARD_POLLING_INTERVAL = 3000
const BOARD_MODULE_ORDER: ModuleDirection[] = ["tx", "rx"]
const ALARM_DISABLED_VALUE = 0
type FrequencyChunk<T> = { key: string; channelOffset: number; items: T[] }
type DisplayRow = {
  label: string
  values: string[]
  statusTones?: StatusTone[]
  indicator?: boolean
}
type DerivedMetricRow = {
  key: string
  label: string
  value: string
  status: string
  statusTone: StatusTone
}
type AlarmRow = {
  key: string
  summary: string
  troubleshooting: string
}

const isOfflineValue = (value?: number | string | boolean | null) => {
  if (value === false || value === 0 || value === "0") {
    return true
  }

  return (
    typeof value === "string" && ["false", "offline", "离线"].includes(value.trim().toLowerCase())
  )
}

const formatFrequency = (value?: number | string | null) => {
  const numberValue = toFiniteNumberOrNull(value)
  return numberValue !== null ? `${numberValue} MHz` : "-"
}

const formatMetricValue = (value?: number | string | null, suffix?: string) => {
  const numberValue = toFiniteNumberOrNull(value)
  return numberValue !== null ? `${numberValue}${suffix || ""}` : "-"
}

const formatBoardNumber = (value?: number | string | null, suffix?: string) => {
  const numberValue = toFiniteNumberOrNull(value)
  if (numberValue === null) {
    return "-"
  }

  const text = Number.isInteger(numberValue) ? `${numberValue}` : numberValue.toFixed(2)
  return `${text}${suffix || ""}`
}

const getStatusClassName = (tone?: StatusTone) => {
  if (tone === "normal") {
    return "libiio-board-table__accent-open"
  }
  if (tone === "abnormal") {
    return "libiio-board-table__accent-abnormal"
  }
  return ""
}

const getStatusLabel = (tone: StatusTone) => {
  if (tone === "normal") {
    return "Normal"
  }
  if (tone === "abnormal") {
    return "Abnormal"
  }
  return "Not judged"
}

const fillMissingChannels = (channels: BoardChannel[] = []) => {
  const channelMap = new Map(channels.map((channel) => [channel.channel_no, channel]))
  const maxChannelNo = Math.max(...channels.map((channel) => channel.channel_no), 0)
  const targetChannelCount = maxChannelNo > CHANNELS_PER_ROW ? MAX_CHANNEL_COUNT : CHANNELS_PER_ROW

  return Array.from({ length: targetChannelCount }, (_, index) => {
    const channelNo = index + 1
    return (
      channelMap.get(channelNo) || {
        channel_no: channelNo,
        configured: false,
        target_freq_mhz: null,
        metric_value: null,
        alarm_enabled: ALARM_DISABLED_VALUE,
        alarm_status: null,
        status_text: "-",
      }
    )
  })
}

const getChannelPowerWValue = (channel: BoardChannel) => toFiniteNumberOrNull(channel.power_w)

const getChannelRssiDbmValue = (channel: BoardChannel) =>
  toFiniteNumberOrNull(channel.rssi_dbm ?? channel.metric_value)

const hasModuleData = (module: BoardModule) =>
  (module.channels || []).some(
    (channel) =>
      channel.configured ||
      toFiniteNumberOrNull(channel.target_freq_mhz) !== null ||
      toFiniteNumberOrNull(channel.metric_value) !== null ||
      toFiniteNumberOrNull(channel.power_w) !== null ||
      toFiniteNumberOrNull(channel.rssi_dbm) !== null,
  )

const isModuleOffline = (module: BoardModule) => {
  const onlineValue = module.is_online ?? module.online
  if (onlineValue !== undefined && onlineValue !== null) {
    return isOfflineValue(onlineValue)
  }

  const statusText = (module.status || module.status_key || module.status_text)
    ?.trim()
    .toLowerCase()
  if (statusText) {
    return statusText.includes("offline") || statusText.includes("离线")
  }

  return !hasModuleData(module)
}

const buildBoardDevices = (devices: BoardDevice[]): BoardDevice[] =>
  devices.map((device) => ({
    ...device,
    modules: (device.modules || []).map((module) => ({
      ...module,
      metric_unit: module.direction === "tx" ? "W" : module.metric_unit || "dBm",
      channels: (module.channels || []).slice(0, MAX_CHANNEL_COUNT),
    })),
  }))

const chunkItems = <T extends { channel_no: number }>(items: T[], size: number) => {
  const result: FrequencyChunk<T>[] = []
  for (let index = 0; index < items.length; index += size) {
    const chunk = items.slice(index, index + size)
    result.push({
      key: chunk.map((item) => item.channel_no).join("-"),
      channelOffset: index,
      items: chunk,
    })
  }
  return result.length
    ? result
    : [
        {
          key: "empty",
          channelOffset: 0,
          items: [],
        },
      ]
}

const FrequencyBoardPage: React.FC = () => {
  const intl = useIntl()
  const [loading, setLoading] = useState(false)
  const [devices, setDevices] = useState<BoardDevice[]>([])
  const loadingRef = useRef(false)
  const t = useCallback(
    (id: string, defaultMessage: string, values?: Record<string, string | number>) =>
      intl.formatMessage({ id, defaultMessage }, values),
    [intl],
  )

  const directionLabelMap = useMemo<Record<ModuleDirection, string>>(
    () => ({
      rx: t("app.device.libiio.type.rxRssi", "RX Receive RSSI"),
      tx: t("app.device.libiio.type.txPower", "TX Transmit Power"),
    }),
    [t],
  )

  const getChannelStatus = useCallback(
    (channel: BoardChannel) => {
      const tone = getChannelStatusTone(channel)
      return {
        text:
          tone === "none"
            ? "-"
            : tone === "abnormal"
            ? t("app.device.libiio.board.statusAbnormal", "Abnormal")
            : t("app.device.libiio.board.statusNormal", "Normal"),
        tone,
      }
    },
    [t],
  )

  const buildDisplayRows = useCallback(
    (direction: ModuleDirection, chunk: BoardChannel[]) => {
      const rows: DisplayRow[] = [
        {
          label: t("app.device.libiio.board.frequency", "Frequency"),
          values: chunk.map((item) => formatFrequency(item.target_freq_mhz)),
        },
      ]

      if (direction === "tx") {
        rows.push({
          label: t("app.device.libiio.txMonitorPowerWithUnit", "Power (W)"),
          values: chunk.map((item) => formatMetricValue(getChannelPowerWValue(item), " W")),
        })
        rows.push({
          label: t("app.device.libiio.board.txVswr", "VSWR"),
          values: chunk.map((item) => {
            const vswr = toFiniteNumberOrNull(item.vswr)
            return vswr === null ? "-" : `${vswr.toFixed(2)}`
          }),
        })
      }

      rows.push({
        label: t("app.device.libiio.rxRssiWithUnit", "RSSI (dBm)"),
        values: chunk.map((item) => formatMetricValue(getChannelRssiDbmValue(item), " dBm")),
      })

      const statuses = chunk.map((item) => getChannelStatus(item))
      rows.push({
        label: t("app.device.libiio.board.status", "Status"),
        values: statuses.map((item) => item.text),
        statusTones: statuses.map((item) => item.tone),
        indicator: true,
      })

      return rows
    },
    [getChannelStatus, t],
  )

  const buildDerivedMetricRows = useCallback(
    (device: BoardDevice): DerivedMetricRow[] => {
      const txVswrStatus = getDeviceVswrStatus(device)
      const isolationStatus = getStatusTone(device.isolation_db_status)

      return [
        {
          key: "tx_vswr",
          label: t("app.device.libiio.board.txVswr", "TX VSWR"),
          value: formatBoardNumber(device.tx_vswr),
          status: getStatusLabel(txVswrStatus),
          statusTone: txVswrStatus,
        },
        {
          key: "isolation_db",
          label: t("app.device.libiio.board.isolation", "Isolation"),
          value: formatBoardNumber(device.isolation_db, "dB"),
          status: getStatusLabel(isolationStatus),
          statusTone: isolationStatus,
        },
      ]
    },
    [t],
  )

  const buildAlarmRows = useCallback(
    (device: BoardDevice): AlarmRow[] => {
      const rows: AlarmRow[] = []

      ;(device.modules || []).forEach((module) => {
        const direction = module.direction
        ;(module.channels || []).forEach((channel) => {
          const alarmStatus = getStatusTone(channel.alarm_status)
          const rssiAlarmStatus = getStatusTone(channel.rssi_alarm_status)
          if (alarmStatus === "abnormal") {
            rows.push({
              key: `${direction}-${channel.channel_no}`,
              summary:
                direction === "tx"
                  ? t(
                      "app.device.libiio.board.txChannelPowerAbnormal",
                      "TX module channel {number} power abnormal",
                      {
                        number: channel.channel_no,
                      },
                    )
                  : t(
                      "app.device.libiio.board.rxChannelRssiAbnormal",
                      "RX module channel {number} RSSI abnormal",
                      {
                        number: channel.channel_no,
                      },
                    ),
              troubleshooting:
                direction === "tx"
                  ? t(
                      "app.device.libiio.board.checkChannelPowerAndFrequency",
                      "Check channel power, frequency, and cable connection.",
                    )
                  : t(
                      "app.device.libiio.board.checkChannelRssiAndAntenna",
                      "Check channel RSSI, frequency, and antenna connection.",
                    ),
            })
          }
          if (rssiAlarmStatus === "abnormal") {
            rows.push({
              key: `tx-${channel.channel_no}-rssi`,
              summary: t(
                "app.device.libiio.board.txChannelRssiAbnormal",
                "TX module channel {number} RSSI abnormal",
                { number: channel.channel_no },
              ),
              troubleshooting: t(
                "app.device.libiio.board.checkChannelRssiAndAntenna",
                "Check channel RSSI, frequency, and antenna connection.",
              ),
            })
          }
        })
      })

      if (getDeviceVswrStatus(device) === "abnormal") {
        rows.push({
          key: "tx_vswr",
          summary: t("app.device.libiio.board.txVswrAbnormal", "TX VSWR abnormal"),
          troubleshooting: t(
            "app.device.libiio.board.checkTxCableAntennaDistance",
            "Check feeder, antenna, and TX/RX antenna installation distance.",
          ),
        })
      }

      if (getStatusTone(device.isolation_db_status) === "abnormal") {
        rows.push({
          key: "isolation_db",
          summary: t("app.device.libiio.board.isolationAbnormal", "Isolation abnormal"),
          troubleshooting: t(
            "app.device.libiio.board.checkAntennaIsolationDistance",
            "Check TX/RX antenna installation distance and surrounding reflection environment.",
          ),
        })
      }

      return rows
    },
    [t],
  )

  const loadBoardData = useCallback(async (silent = false) => {
    if (loadingRef.current) {
      return
    }

    loadingRef.current = true

    try {
      if (!silent) {
        setLoading(true)
      }

      const boardRes = await Services.api.postLibiioBoardList(
        {},
        {
          showLoading: false,
          showToast: false,
        },
      )
      setDevices(buildBoardDevices(boardRes?.res?.list || []))
    } catch (error) {
    } finally {
      loadingRef.current = false
      if (!silent) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    loadBoardData(false)
    const timer = window.setInterval(() => {
      loadBoardData(true)
    }, BOARD_POLLING_INTERVAL)

    return () => {
      window.clearInterval(timer)
    }
  }, [loadBoardData])

  const boardPanels = useMemo<BoardPanel[]>(
    () =>
      devices.map((device) => ({
        key: `${device.device_id || device.ip}`,
        device,
        sections: BOARD_MODULE_ORDER.map((direction) => {
          const module =
            (device.modules || []).find((item) => item.direction === direction) ||
            ({
              direction,
              channels: [],
              metric_unit: direction === "tx" ? "W" : "dBm",
            } as BoardModule)

          return {
            key: `${device.device_id}-${direction}`,
            device,
            direction: module.direction,
            directionLabel: directionLabelMap[module.direction],
            moduleIp: module.ip,
            isOffline: isModuleOffline(module),
            chunks: chunkItems(fillMissingChannels(module.channels), CHANNELS_PER_ROW),
          }
        }),
        derivedMetricRows: buildDerivedMetricRows(device),
        alarmRows: buildAlarmRows(device),
      })),
    [buildAlarmRows, buildDerivedMetricRows, devices, directionLabelMap],
  )

  return (
    <PageContainer className="libiio-board-page" title={false}>
      <Card className="libiio-board-shell">
        <Spin spinning={loading}>
          {boardPanels.length ? (
            <div className="libiio-board-list">
              {boardPanels.map(({ key, device, sections, derivedMetricRows, alarmRows }) => (
                <section className="libiio-board-device" key={key}>
                  <div className="libiio-board-device__meta">
                    {device.ip ||
                      t("app.device.libiio.board.deviceWithId", "Device #{id}", {
                        id: device.device_id,
                      })}
                  </div>

                  {sections.map(
                    ({
                      key: sectionKey,
                      direction,
                      directionLabel,
                      moduleIp,
                      isOffline,
                      chunks,
                    }) => (
                      <section className="libiio-board-section" key={sectionKey}>
                        <div className="libiio-board-section__title">{directionLabel}</div>
                        <div className="libiio-board-section__meta">
                          {moduleIp || t("app.device.status.moduleOffline", "Module Offline")}
                        </div>

                        {isOffline ? (
                          <div className="libiio-board-offline">
                            {t("app.device.status.moduleOffline", "Module Offline")}
                          </div>
                        ) : (
                          <div className="libiio-board-table-wrap">
                            <table className="libiio-board-table">
                              <tbody>
                                {chunks.map((chunk) => (
                                  <React.Fragment key={`${device.device_id}-${chunk.key}`}>
                                    <tr className="libiio-board-table__channel-row">
                                      <th>{t("app.device.libiio.board.channel", "Channel")}</th>
                                      {CHANNEL_COLUMNS.map((channelNumber) => (
                                        <th
                                          className={
                                            chunk.items[channelNumber - 1]?.is_maintaining
                                              ? "is-maintaining"
                                              : ""
                                          }
                                          key={`${device.device_id}-${chunk.key}-channel-${channelNumber}`}
                                        >
                                          <>
                                            {t(
                                              "app.device.libiio.board.channelWithNumber",
                                              "Channel {number}",
                                              {
                                                number: chunk.channelOffset + channelNumber,
                                              },
                                            )}
                                            {chunk.items[channelNumber - 1]?.is_maintaining ? (
                                              <small className="libiio-board-maintenance-label">
                                                {t(
                                                  "app.device.libiio.board.maintenance",
                                                  "Under maintenance",
                                                )}
                                              </small>
                                            ) : null}
                                          </>
                                        </th>
                                      ))}
                                    </tr>

                                    {buildDisplayRows(direction, chunk.items).map((row) => (
                                      <tr
                                        key={`${device.device_id}-${direction}-${chunk.key}-${row.label}`}
                                      >
                                        <td className="libiio-board-table__row-label">
                                          {row.label}
                                        </td>
                                        {CHANNEL_COLUMNS.map((channelNumber) => (
                                          <td
                                            key={`${device.device_id}-${direction}-${chunk.key}-${row.label}-${channelNumber}`}
                                            className={
                                              chunk.items[channelNumber - 1]?.is_maintaining
                                                ? "is-maintaining"
                                                : ""
                                            }
                                          >
                                            {row.indicator ? (
                                              <span
                                                className={`libiio-board-status-indicator ${getStatusClassName(
                                                  row.statusTones?.[channelNumber - 1],
                                                )}`}
                                                role="img"
                                                aria-label={getStatusLabel(
                                                  row.statusTones?.[channelNumber - 1] || "none",
                                                )}
                                                title={getStatusLabel(
                                                  row.statusTones?.[channelNumber - 1] || "none",
                                                )}
                                              >
                                                <span className="libiio-board-status-indicator__dot" />
                                              </span>
                                            ) : (
                                              <span
                                                className={getStatusClassName(
                                                  row.statusTones?.[channelNumber - 1],
                                                )}
                                              >
                                                {chunk.items[channelNumber - 1]?.is_maintaining
                                                  ? row.label ===
                                                    t(
                                                      "app.device.libiio.board.frequency",
                                                      "Frequency",
                                                    )
                                                    ? `${row.values[channelNumber - 1]} · ${t(
                                                        "app.device.libiio.board.maintenance",
                                                        "Under maintenance",
                                                      )}`
                                                    : "-"
                                                  : row.values[channelNumber - 1] || "-"}
                                              </span>
                                            )}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    ),
                  )}

                  <div className="libiio-board-summary">
                    <div className="libiio-board-summary__metrics">
                      <table className="libiio-board-summary-table">
                        <thead>
                          <tr>
                            <th>{t("app.device.libiio.board.name", "Name")}</th>
                            {derivedMetricRows.map((row) => (
                              <th key={row.key}>{row.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{t("app.device.libiio.board.measuredValue", "Measured Value")}</td>
                            {derivedMetricRows.map((row) => (
                              <td key={row.key}>{row.value}</td>
                            ))}
                          </tr>
                          <tr>
                            <td>{t("app.device.libiio.board.status", "Status")}</td>
                            {derivedMetricRows.map((row) => (
                              <td key={row.key}>
                                <span
                                  className={`libiio-board-status-indicator ${getStatusClassName(
                                    row.statusTone,
                                  )}`}
                                  role="img"
                                  aria-label={row.status}
                                  title={row.status}
                                >
                                  <span className="libiio-board-status-indicator__dot" />
                                </span>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="libiio-board-summary__alarms">
                      <table className="libiio-board-summary-table">
                        <thead>
                          <tr>
                            <th className="libiio-board-summary-table__index">
                              {t("app.device.libiio.board.sequence", "No.")}
                            </th>
                            <th>
                              {t(
                                "app.device.libiio.board.currentAlarmSummary",
                                "Current Alarm Summary",
                              )}
                            </th>
                            <th>
                              {t("app.device.libiio.board.troubleshooting", "Troubleshooting")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {alarmRows.length ? (
                            alarmRows.map((row, index) => (
                              <tr key={row.key}>
                                <td>{index + 1}</td>
                                <td>{row.summary}</td>
                                <td>{row.troubleshooting}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td>1</td>
                              <td>
                                {t("app.device.libiio.board.noCurrentAlarm", "No current alarms")}
                              </td>
                              <td>
                                {t(
                                  "app.device.libiio.board.noTroubleshootingRequired",
                                  "No action required",
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <Empty description={t("app.device.libiio.board.empty", "No frequency data")} />
          )}
        </Spin>
      </Card>
    </PageContainer>
  )
}

export default FrequencyBoardPage
