import React, { useState, useEffect, useCallback } from "react"
import { PageContainer } from "@ant-design/pro-components"
import type { UploadProps } from "antd"
import { Divider, Select, Switch } from "antd"
import { Card, Form, Input, Button, message, Upload } from "antd"
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons"
import type { RcFile } from "antd/es/upload"
import Services from "@/pages/setting/services"
import { SYSTEM_CONFIG } from "@/constants"
import { useIntl } from "umi"
import { BASE_LOCALE, I18N_ENABLED } from "@/utils/i18n"

const beforeUpload = (file: RcFile, t: (id: string, defaultMessage: string) => string) => {
  const supportedTypes = ["image/png", "image/jpeg", "image/gif"]
  const isSupportedImage = supportedTypes.includes(file.type)
  if (!isSupportedImage) {
    message.error(
      t("app.setting.system.logo.supportedFormats", "Supported formats: PNG, JPG, and GIF"),
    )
  }
  const isLt20M = file.size / 1024 / 1024 <= 20
  if (!isLt20M) {
    message.error(t("app.setting.system.logo.sizeLimit", "Image must be smaller than 2 MB"))
  }
  return isSupportedImage && isLt20M
}

const SystemSetting: React.FC = () => {
  const intl = useIntl()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>()
  const t = useCallback(
    (id: string, defaultMessage: string) => intl.formatMessage({ id, defaultMessage }),
    [intl],
  )

  const reportLocaleOptions = [
    { label: t("app.setting.system.reportLocale.enUS", "English"), value: "en-US" },
    { label: t("app.setting.system.reportLocale.zhCN", "Chinese"), value: "zh-CN" },
  ]

  const getSystemConfig = useCallback(async () => {
    const res = await Services.api.postSystemConfig({})
    if (res) {
      setImageUrl(res.res.system_logo)
      form.setFieldsValue({
        report_locale: BASE_LOCALE,
        ...res.res,
      })
    }
  }, [form])

  useEffect(() => {
    getSystemConfig()
  }, [getSystemConfig])

  const onFinish = async (values: any) => {
    Services.api
      .postSystemConfigSave({
        ...values,
        report_locale: I18N_ENABLED ? values.report_locale || BASE_LOCALE : BASE_LOCALE,
      })
      .then((res) => {
        localStorage.setItem(SYSTEM_CONFIG, JSON.stringify(res.res))
      })
      .then(() => {
        window.location.reload()
      })
  }

  const handleUpload: UploadProps["customRequest"] = (options) => {
    setLoading(true)
    Services.api
      .postSystemLogoUpload({ file: options.file }, { showToast: true })
      .then((res) => {
        const url = res?.res?.system_logo
        if (!url) throw new Error("Logo upload did not return a path")
        setImageUrl(url)
        form.setFieldsValue({ system_logo: url })
        options.onSuccess?.(res)
      })
      .catch((error) => {
        options.onError?.(error)
      })
      .finally(() => setLoading(false))
  }

  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>{t("app.common.upload", "Upload")}</div>
    </div>
  )
  return (
    <PageContainer>
      <Form form={form} layout="horizontal" onFinish={onFinish}>
        <Card title={t("app.setting.system.title", "System Settings")}>
          <Form.Item
            labelCol={{ span: 6 }}
            label={t("app.setting.system.name", "System Name")}
            name="system_name"
            rules={[
              {
                required: true,
                message: t("app.setting.system.name.required", "Please enter the system name"),
              },
            ]}
            style={{ maxWidth: 600 }}
          >
            <Input
              placeholder={t("app.setting.system.name.placeholder", "Please enter the system name")}
            />
          </Form.Item>
          <Form.Item
            name="system_logo"
            hidden
            rules={[
              {
                required: true,
                message: t("app.setting.system.logo.required", "Please upload a logo"),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            labelCol={{ span: 6 }}
            label={t("app.setting.system.logo", "System Logo")}
            style={{ maxWidth: 600 }}
          >
            <Upload
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              beforeUpload={(file) => beforeUpload(file, t)}
              customRequest={handleUpload}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="avatar" style={{ width: "100%" }} />
              ) : (
                uploadButton
              )}
            </Upload>
          </Form.Item>
          <Divider dashed={true} />
          <Form.Item
            labelCol={{ span: 6 }}
            label={t("app.setting.system.dps", "Data Collection Frequency")}
            name="dots_per_second"
            rules={[
              {
                required: true,
                message: t(
                  "app.setting.system.dps.required",
                  "Please select a data collection frequency",
                ),
              },
            ]}
            style={{ maxWidth: 600 }}
          >
            <Select
              defaultValue={1}
              options={[
                { label: t("app.setting.system.dps.1", "1 time/sec"), value: 1 },
                { label: t("app.setting.system.dps.5", "5 times/sec"), value: 5 },
                { label: t("app.setting.system.dps.10", "10 times/sec"), value: 10 },
              ]}
            />
          </Form.Item>
          <Form.Item
            labelCol={{ span: 6 }}
            label={t("app.setting.system.refresh", "Page Refresh Frequency")}
            name="refresh_interval"
            rules={[
              {
                required: true,
                message: t(
                  "app.setting.system.refresh.required",
                  "Please select a refresh frequency",
                ),
              },
            ]}
            style={{ maxWidth: 600 }}
          >
            <Select
              defaultValue={3000}
              options={[
                { label: t("app.setting.system.refresh.500", "500 ms/time"), value: 500 },
                { label: t("app.setting.system.refresh.1000", "1 sec/time"), value: 1000 },
                { label: t("app.setting.system.refresh.3000", "3 sec/time"), value: 3000 },
                { label: t("app.setting.system.refresh.5000", "5 sec/time"), value: 5000 },
                { label: t("app.setting.system.refresh.10000", "10 sec/time"), value: 10000 },
              ]}
            />
          </Form.Item>
          {I18N_ENABLED && (
            <Form.Item
              labelCol={{ span: 6 }}
              label={t("app.setting.system.reportLocale", "Email and Backup File Language")}
              name="report_locale"
              initialValue="en-US"
              rules={[
                {
                  required: true,
                  message: t(
                    "app.setting.system.reportLocale.required",
                    "Please select a language for email and backup files",
                  ),
                },
              ]}
              style={{ maxWidth: 600 }}
            >
              <Select options={reportLocaleOptions} />
            </Form.Item>
          )}
          <Divider dashed={true} />
          <Form.Item
            labelCol={{ span: 6 }}
            label={t("app.setting.system.email.host", "Mail Server")}
            name={["email_config", "host"]}
            style={{ maxWidth: 600 }}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue(["email_config", "is_send"]) && !value) {
                    return Promise.reject(
                      new Error(
                        t(
                          "app.setting.system.email.host.requiredWhenEnabled",
                          "Mail server is required when email sending is enabled",
                        ),
                      ),
                    )
                  }
                  return Promise.resolve()
                },
              }),
            ]}
          >
            <Input
              placeholder={t(
                "app.setting.system.email.host.placeholder",
                "For example: smtp.qq.com",
              )}
            />
          </Form.Item>
          <Form.Item
            labelCol={{ span: 6 }}
            label={t("app.setting.system.email.port", "Mail Server Port")}
            name={["email_config", "port"]}
            style={{ maxWidth: 600 }}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue(["email_config", "is_send"]) && !value) {
                    return Promise.reject(
                      new Error(
                        t(
                          "app.setting.system.email.port.requiredWhenEnabled",
                          "Port is required when email sending is enabled",
                        ),
                      ),
                    )
                  }
                  return Promise.resolve()
                },
              }),
            ]}
          >
            <Input
              placeholder={t(
                "app.setting.system.email.port.placeholder",
                "For example: 465 or 587",
              )}
            />
          </Form.Item>
          <Form.Item
            labelCol={{ span: 6 }}
            label={t("app.setting.system.email.username", "Mail Server Username")}
            name={["email_config", "username"]}
            style={{ maxWidth: 600 }}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue(["email_config", "is_send"]) && !value) {
                    return Promise.reject(
                      new Error(
                        t(
                          "app.setting.system.email.username.requiredWhenEnabled",
                          "Username is required when email sending is enabled",
                        ),
                      ),
                    )
                  }
                  return Promise.resolve()
                },
              }),
            ]}
          >
            <Input
              placeholder={t("app.setting.system.email.username.placeholder", "Email address")}
            />
          </Form.Item>
          <Form.Item
            labelCol={{ span: 6 }}
            label={t("app.setting.system.email.authCode", "Mail Server Authorization Code")}
            name={["email_config", "authorization_code"]}
            style={{ maxWidth: 600 }}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue(["email_config", "is_send"]) && !value) {
                    return Promise.reject(
                      new Error(
                        t(
                          "app.setting.system.email.authCode.requiredWhenEnabled",
                          "Authorization code is required when email sending is enabled",
                        ),
                      ),
                    )
                  }
                  return Promise.resolve()
                },
              }),
            ]}
          >
            <Input
              placeholder={t(
                "app.setting.system.email.authCode.placeholder",
                "Email authorization code, not the login password",
              )}
            />
          </Form.Item>
          <Form.Item
            labelCol={{ span: 6 }}
            label={t("app.setting.system.email.enable", "Enable Email Sending")}
            name={["email_config", "is_send"]}
            style={{ maxWidth: 600 }}
            valuePropName="checked"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value) {
                    const emailConfig = getFieldValue("email_config")
                    if (
                      !emailConfig?.host ||
                      !emailConfig?.port ||
                      !emailConfig?.username ||
                      !emailConfig?.authorization_code
                    ) {
                      return Promise.reject(
                        new Error(
                          t(
                            "app.setting.system.email.completeBeforeEnable",
                            "Please complete the email configuration before enabling email sending",
                          ),
                        ),
                      )
                    }
                  }
                  return Promise.resolve()
                },
              }),
            ]}
          >
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {t("app.common.saveSettings", "Save Settings")}
            </Button>
          </Form.Item>
        </Card>
      </Form>
    </PageContainer>
  )
}

export default SystemSetting
