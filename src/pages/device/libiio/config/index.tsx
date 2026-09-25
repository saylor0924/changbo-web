import { PageContainer } from "@ant-design/pro-components"
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Spin,
  Switch,
} from "antd"
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { history, useIntl } from "umi"
import Services from "@/pages/device/services"
import type {
  API_PostLibiioDeviceConfigList,
  API_PostLibiioDeviceConfigSave,
} from "@/pages/device/services/typings/device"
import { formatApiResponseMessage } from "@/utils/i18n"
import "./index.less"

type FrequencyConfigPageProps = {
  location?: {
    query?: {
      direction?: string
    }
  }
  match?: {
    params?: {
      deviceId?: string
    }
  }
}

type FrequencyFormItem = Omit<API_PostLibiioDeviceConfigSave.ConfigItem, "target_freq_mhz"> & {
  target_freq_mhz?: number
}
const MAX_FREQUENCY_CONFIG_COUNT = 20
const OFFSET_UNIT = "dB"
const TX_ALARM_VALUE_UNIT = "W"
const RX_ALARM_VALUE_UNIT = "dBm"
const ALARM_ENABLED_VALUE = 1
const ALARM_DISABLED_VALUE = 0

const createEmptyConfigItem = (direction: "rx" | "tx" = "rx"): FrequencyFormItem => ({
  device_id: 0,
  type: direction,
  direction,
  sort: undefined,
  target_freq_mhz: undefined,
  power_offset_db: undefined,
  is_alarm: ALARM_DISABLED_VALUE,
  is_maintaining: -1,
  min: undefined,
  max: undefined,
})

const sortConfigs = <T extends { sort?: number; id?: number }>(configs: T[]) =>
  [...configs].sort((prev, next) => {
    const prevSort = typeof prev.sort === "number" ? prev.sort : Number.MAX_SAFE_INTEGER
    const nextSort = typeof next.sort === "number" ? next.sort : Number.MAX_SAFE_INTEGER

    if (prevSort !== nextSort) {
      return prevSort - nextSort
    }

    return (prev.id || 0) - (next.id || 0)
  })

const toFiniteNumber = (value?: number | string | null) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value === "string" && value.trim()) {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : undefined
  }

  return undefined
}

const buildConfigList = (
  configs: API_PostLibiioDeviceConfigList.ConfigItem[] | undefined,
  direction: "rx" | "tx",
) =>
  sortConfigs(configs || []).map((config) => ({
    id: config.id,
    device_id: config.device_id,
    type: config.type || direction,
    direction: config.direction || direction,
    sort: config.sort,
    target_freq_mhz: config.target_freq_mhz,
    power_offset_db: toFiniteNumber(config.power_offset_db),
    is_alarm: config.is_alarm ?? ALARM_DISABLED_VALUE,
    is_maintaining: config.is_maintaining ?? -1,
    min: toFiniteNumber(config.min),
    max: toFiniteNumber(config.max),
  }))

const buildConfigPayloadByDirection = (config: FrequencyFormItem, direction: "rx" | "tx") => ({
  id: config.id,
  device_id: config.device_id,
  type: direction,
  direction,
  sort: config.sort,
  target_freq_mhz: config.target_freq_mhz as number,
  power_offset_db: config.power_offset_db,
  is_alarm: config.is_alarm,
  is_maintaining: config.is_maintaining ?? -1,
  min: config.min,
  max: config.max,
})

const isEmptyFieldValue = (value: unknown) => value === undefined || value === null || value === ""

const FrequencyConfigPage: React.FC<FrequencyConfigPageProps> = (props) => {
  const intl = useIntl()
  const [form] = Form.useForm<{ configs: FrequencyFormItem[] }>()
  const [loading, setLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const currentConfigs = Form.useWatch("configs", form) || []
  const currentConfigCount = currentConfigs.length
  const isFrequencyLimitReached = currentConfigCount >= MAX_FREQUENCY_CONFIG_COUNT
  const t = useCallback(
    (id: string, defaultMessage: string, values?: Record<string, string | number>) =>
      intl.formatMessage({ id, defaultMessage }, values),
    [intl],
  )

  const deviceId = Number(props.match?.params?.deviceId)
  const isValidDeviceId = Number.isFinite(deviceId) && deviceId > 0
  const direction = props.location?.query?.direction === "tx" ? "tx" : "rx"
  const directionLabel =
    direction === "tx"
      ? t("app.device.libiio.module.tx", "TX Module")
      : t("app.device.libiio.module.rx", "RX Module")
  const offsetLabel =
    direction === "tx"
      ? t("app.device.libiio.txPowerOffsetDb", "TX Power Offset (dB)")
      : t("app.device.libiio.rxRssiOffsetDb", "RX RSSI Offset (dB)")
  const alarmValueUnit = direction === "tx" ? TX_ALARM_VALUE_UNIT : RX_ALARM_VALUE_UNIT

  const loadPageData = useCallback(async () => {
    if (!isValidDeviceId) {
      return
    }

    try {
      setLoading(true)
      const configRes = await Services.api.postLibiioDeviceConfigList(
        {
          page: 1,
          limit: 200,
          device_id: deviceId,
          direction,
        },
        {
          showLoading: false,
          showToast: false,
        },
      )

      const configs = sortConfigs(configRes?.res?.list || [])
      form.setFieldsValue({
        configs: configs.length
          ? buildConfigList(configs, direction)
          : [createEmptyConfigItem(direction)],
      })
    } catch (error) {
      message.error(t("app.device.libiio.config.fetchFailed", "Failed to load frequency config"))
    } finally {
      setLoading(false)
    }
  }, [deviceId, direction, form, isValidDeviceId, t])

  useEffect(() => {
    loadPageData()
  }, [loadPageData])

  const handleSave = useCallback(async () => {
    if (!isValidDeviceId) {
      message.error(t("app.device.libiio.config.invalidDevice", "Invalid device parameter"))
      return
    }

    try {
      const values = await form.validateFields()
      if ((values.configs || []).length > MAX_FREQUENCY_CONFIG_COUNT) {
        message.error(
          t("app.device.libiio.config.maxFrequencyCount", "You can add up to 20 frequencies"),
        )
        return
      }

      setSubmitLoading(true)
      const configs = (values.configs || []).map((item, index) => ({
        ...item,
        sort: index + 1,
      }))

      await Services.api.postLibiioDeviceConfigSave(
        {
          device_id: deviceId,
          direction,
          list: configs.map((item) => ({
            ...buildConfigPayloadByDirection(item, direction),
            device_id: deviceId,
          })),
        },
        {
          showLoading: false,
          showToast: false,
        },
      )

      message.success(t("app.device.libiio.config.saveSuccess", "Frequency config saved"))
      await loadPageData()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      message.error(
        formatApiResponseMessage(
          error,
          t("app.device.libiio.config.saveFailed", "Failed to save frequency config"),
          t,
        ),
      )
    } finally {
      setSubmitLoading(false)
    }
  }, [deviceId, direction, form, isValidDeviceId, loadPageData, t])

  const handleAddFrequency = useCallback(() => {
    const configs = form.getFieldValue("configs") || []
    if (configs.length >= MAX_FREQUENCY_CONFIG_COUNT) {
      message.warning(
        t("app.device.libiio.config.maxFrequencyCount", "You can add up to 20 frequencies"),
      )
      return
    }

    form.setFieldValue("configs", [...configs, createEmptyConfigItem(direction)])
  }, [direction, form, t])

  const pageTitle = useMemo(() => {
    if (!isValidDeviceId) {
      return t("app.device.libiio.config.title", "Frequency Config")
    }
    return t("app.device.libiio.config.titleWithDevice", "Frequency Config · Device #{deviceId}", {
      deviceId: `${deviceId} · ${directionLabel}`,
    })
  }, [deviceId, directionLabel, isValidDeviceId, t])

  return (
    <PageContainer className="libiio-config-page" title={pageTitle}>
      <Card className="libiio-config-shell">
        <div className="libiio-config-toolbar">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => history.push("/device/libiio")}>
              {t("app.device.libiio.config.backToDevices", "Back to Device List")}
            </Button>
            <Button
              icon={<PlusOutlined />}
              type="dashed"
              disabled={isFrequencyLimitReached}
              onClick={handleAddFrequency}
            >
              {t("app.device.libiio.config.addFrequency", "Add Frequency")}
            </Button>
          </Space>
        </div>

        <Spin spinning={loading}>
          {!isValidDeviceId ? (
            <Alert
              type="error"
              showIcon
              message={t(
                "app.device.libiio.config.invalidDeviceMessage",
                "Invalid device parameter",
              )}
              description={t(
                "app.device.libiio.config.invalidDeviceDescription",
                "Please return to the device list and enter again.",
              )}
            />
          ) : (
            <>
              <Card className="libiio-config-summary">
                <Descriptions column={2} size="small">
                  <Descriptions.Item label={t("app.device.libiio.deviceId", "Device ID")}>
                    {deviceId}
                  </Descriptions.Item>
                  <Descriptions.Item label={t("app.device.libiio.moduleDirection", "Module")}>
                    {directionLabel}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={t(
                      "app.device.libiio.config.currentFrequencyCount",
                      "Current Frequencies",
                    )}
                  >
                    {currentConfigCount}/{MAX_FREQUENCY_CONFIG_COUNT}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Form form={form} layout="vertical">
                <Form.List name="configs">
                  {(fields, { add, move, remove }) => (
                    <>
                      <div className="libiio-config-grid">
                        {fields.length ? (
                          fields.map((field, index) => {
                            const { key: fieldKey, ...restField } = field

                            return (
                              <Card
                                className="libiio-config-card"
                                key={fieldKey}
                                title={t(
                                  "app.device.libiio.config.frequencyWithIndex",
                                  "Frequency {index}",
                                  {
                                    index: index + 1,
                                  },
                                )}
                                extra={
                                  <Space size={4}>
                                    <Button
                                      type="link"
                                      icon={<ArrowUpOutlined />}
                                      disabled={index === 0}
                                      onClick={() => move(field.name, field.name - 1)}
                                    >
                                      {t("app.common.moveUp", "Move Up")}
                                    </Button>
                                    <Button
                                      type="link"
                                      icon={<ArrowDownOutlined />}
                                      disabled={index === fields.length - 1}
                                      onClick={() => move(field.name, field.name + 1)}
                                    >
                                      {t("app.common.moveDown", "Move Down")}
                                    </Button>
                                    <Button
                                      type="link"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => remove(field.name)}
                                    >
                                      {t("app.common.delete", "Delete")}
                                    </Button>
                                  </Space>
                                }
                              >
                                <Form.Item {...restField} name={[field.name, "id"]} hidden>
                                  <InputNumber />
                                </Form.Item>
                                <Form.Item {...restField} name={[field.name, "sort"]} hidden>
                                  <InputNumber />
                                </Form.Item>
                                <Row gutter={[12, 0]}>
                                  <Col xs={24} sm={12} lg={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[field.name, "is_maintaining"]}
                                      label={t(
                                        "app.device.libiio.config.isMaintaining",
                                        "Under Maintenance",
                                      )}
                                      getValueProps={(value) => ({ checked: value === 1 })}
                                      normalize={(checked) => (checked ? 1 : -1)}
                                    >
                                      <Switch
                                        checkedChildren={t("app.common.yes", "Yes")}
                                        unCheckedChildren={t("app.common.no", "No")}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} sm={12} lg={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[field.name, "target_freq_mhz"]}
                                      label={t(
                                        "app.device.libiio.config.targetFrequency",
                                        "Target Frequency (MHz)",
                                      )}
                                      rules={[
                                        {
                                          required: true,
                                          message: t(
                                            "app.device.libiio.config.targetFrequencyRequired",
                                            "Please enter target frequency",
                                          ),
                                        },
                                      ]}
                                    >
                                      <InputNumber style={{ width: "100%" }} min={0} />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} sm={12} lg={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[field.name, "power_offset_db"]}
                                      label={offsetLabel}
                                    >
                                      <InputNumber
                                        style={{ width: "100%" }}
                                        addonAfter={OFFSET_UNIT}
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>
                                <Row gutter={[12, 0]}>
                                  <Col xs={24} sm={12} lg={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[field.name, "is_alarm"]}
                                      label={t("app.device.libiio.config.isAlarm", "Alarm Enabled")}
                                      rules={[
                                        {
                                          required: true,
                                          message: t(
                                            "app.device.libiio.config.isAlarmRequired",
                                            "Please select whether alarm is enabled",
                                          ),
                                        },
                                      ]}
                                    >
                                      <Select
                                        options={[
                                          {
                                            label: t("app.common.yes", "Yes"),
                                            value: ALARM_ENABLED_VALUE,
                                          },
                                          {
                                            label: t("app.common.no", "No"),
                                            value: ALARM_DISABLED_VALUE,
                                          },
                                        ]}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} sm={12} lg={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[field.name, "min"]}
                                      label={t(
                                        "app.device.libiio.config.minValueWithUnit",
                                        "Minimum ({unit})",
                                        { unit: alarmValueUnit },
                                      )}
                                    >
                                      <InputNumber
                                        style={{ width: "100%" }}
                                        addonAfter={alarmValueUnit}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} sm={12} lg={8}>
                                    <Form.Item
                                      {...restField}
                                      name={[field.name, "max"]}
                                      label={t(
                                        "app.device.libiio.config.maxValueWithUnit",
                                        "Maximum ({unit})",
                                        { unit: alarmValueUnit },
                                      )}
                                      dependencies={[
                                        ["configs", field.name, "is_alarm"],
                                        ["configs", field.name, "min"],
                                      ]}
                                      rules={[
                                        ({ getFieldValue }) => ({
                                          validator(_, value) {
                                            const isAlarm =
                                              getFieldValue(["configs", field.name, "is_alarm"]) ===
                                              ALARM_ENABLED_VALUE
                                            const min = getFieldValue([
                                              "configs",
                                              field.name,
                                              "min",
                                            ])
                                            if (
                                              isAlarm &&
                                              isEmptyFieldValue(min) &&
                                              isEmptyFieldValue(value)
                                            ) {
                                              return Promise.reject(
                                                new Error(
                                                  t(
                                                    "app.device.libiio.config.alarmRangeRequired",
                                                    "Please enter minimum or maximum when alarm is enabled",
                                                  ),
                                                ),
                                              )
                                            }
                                            if (
                                              typeof min === "number" &&
                                              typeof value === "number" &&
                                              min > value
                                            ) {
                                              return Promise.reject(
                                                new Error(
                                                  t(
                                                    "app.device.libiio.config.maxLessThanMin",
                                                    "Maximum value cannot be less than minimum value",
                                                  ),
                                                ),
                                              )
                                            }
                                            return Promise.resolve()
                                          },
                                        }),
                                      ]}
                                    >
                                      <InputNumber
                                        style={{ width: "100%" }}
                                        addonAfter={alarmValueUnit}
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              </Card>
                            )
                          })
                        ) : (
                          <Alert
                            type="info"
                            showIcon
                            message={t(
                              "app.device.libiio.config.emptyMessage",
                              "No frequency config yet",
                            )}
                            description={t(
                              "app.device.libiio.config.emptyDescription",
                              "Click Add Frequency in the upper left to start configuring.",
                            )}
                          />
                        )}
                      </div>
                      {!fields.length && (
                        <div className="libiio-config-empty-action">
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            disabled={isFrequencyLimitReached}
                            onClick={() => {
                              if (fields.length >= MAX_FREQUENCY_CONFIG_COUNT) {
                                message.warning(
                                  t(
                                    "app.device.libiio.config.maxFrequencyCount",
                                    "You can add up to 20 frequencies",
                                  ),
                                )
                                return
                              }
                              add(createEmptyConfigItem(direction))
                            }}
                          >
                            {t("app.device.libiio.config.addFirstFrequency", "Add First Frequency")}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </Form.List>
              </Form>
              <div className="libiio-config-footer">
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={submitLoading}
                  onClick={handleSave}
                >
                  {t("app.device.libiio.config.saveConfig", "Save Config")}
                </Button>
              </div>
            </>
          )}
        </Spin>
      </Card>
    </PageContainer>
  )
}

export default FrequencyConfigPage
