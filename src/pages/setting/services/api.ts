import { getApi, postApi } from "@/utils/request"

export async function postSystemConfig(
  obj: Record<string, any>,
  extParams?: PassExtParamsDescriptorMore,
) {
  const res: API_PostSystemConfig.Res = await getApi(
    "system/config",
    { ...obj },
    {
      showLoading: true,
      showToast: false, // 登录页面不需要显示toast
      ...extParams,
    },
  ).catch((err) => {
    throw err
  })

  return res
}

export async function postSystemConfigSave(
  obj: Record<string, any>,
  extParams?: PassExtParamsDescriptorMore,
) {
  const res: API_PostSystemConfig.Res = await postApi(
    "system/configSave",
    { ...obj },
    {
      showLoading: true,
      showToast: false, // 登录页面不需要显示toast
      ...extParams,
    },
  ).catch((err) => {
    throw err
  })

  return res
}

export async function postSystemLogoUpload(
  obj: Record<string, any>,
  extParams?: PassExtParamsDescriptorMore,
) {
  const res = await postApi(
    "system/logo/upload",
    { ...obj },
    {
      "Content-Type": "multipart/form-data",
      showLoading: false,
      showToast: false,
      ...extParams,
    },
  )
  return res
}
