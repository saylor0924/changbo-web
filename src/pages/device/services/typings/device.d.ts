declare namespace API_PostDeviceList {
  export interface ApiEnvelope<T> {
    err: number
    msg: string
    msg_key?: string
    res_key?: string
    res: T
  }

  export interface Result {
    err: number
    msg: string
    msg_key?: string
    res_key?: string
    res: Res
  }

  export interface Res {
    has_more: number
    next_page: number
    total: number
    list: List[]
  }

  export interface List {
    id: number
    ip: string
    name: string
    position: string
    device_type_group: string
    device_type_group_key?: string
    device_type_id: number
    device_type: string
    device_type_alias: string
    device_type_alias_key?: string
    status: string | bigint
    status_key?: string
    status_text?: string
    tag_color: string
    is_maintaining: boolean
    is_alarm: boolean
    is_module_online: boolean
    is_online: boolean
    metric_items: MetricItems[]
    alarm_items: AlarmItems[]
    panel_info?: Record<string, any>
  }

  export interface MetricItems {
    //
    config_type: number
    config_type_name: string
    config_type_key?: string
    current_val: number | boolean
    current_val_type: string
    is_set_current_val: boolean
    show_min_val: number | undefined
    show_max_val: number | undefined
    show_in_list: string
    show_in_detail: string
    unit: string
    alarm_min: number | undefined
    alarm_max: number | undefined
    is_module: boolean
    is_alarm: boolean
  }
  export interface AlarmItems {
    config_type: number
    config_type_name: string
    config_type_key?: string
    current_val: number
    is_alarm: boolean
    suggested_action?: string
    suggested_action_key?: string
  }
}

declare namespace API_PostLibiioDeviceList {
  export interface OutputFrequencyConfig {
    name?: string
    frequency_mhz?: number
  }

  export interface Result {
    err: number
    msg: string
    res: Res
  }

  export interface Res {
    has_more: number
    next_page: number
    total: number
    list: List[]
  }

  export interface List {
    id: number
    ip?: string
    direction?: string
    type?: number
    center_freq: number
    sampling_rate: number
    fft_size: number
    full_scale_power_dbm?: number
    tx_power_offset_db?: number
    tx_hardware_gain_db?: number
    rx_rssi_offset_db?: number
    rx_hardware_gain_db?: number
    rx_ip?: string
    rx_center_freq?: number
    rx_sampling_rate?: number
    rx_fft_size?: number
    tx_ip?: string
    tx_center_freq?: number
    tx_sampling_rate?: number
    tx_fft_size?: number
    target_freq_count?: number
    output_frequency_count?: number
    output_frequency_configs?: OutputFrequencyConfig[]
    created_at: string
    updated_at: string
  }
}

declare namespace API_PostLibiioDeviceConfigList {
  export interface ConfigItem {
    id?: number
    device_id: number
    type?: "rx" | "tx"
    sort?: number
    target_freq_mhz: number
    power_offset_db?: number
    power_w?: number
    rssi_dbm?: number
    metric_value?: number | string
    direction?: "rx" | "tx"
    is_alarm: number
    is_maintaining?: number
    min?: number | string
    max?: number | string
    created_at?: string
    updated_at?: string
  }

  export interface Params {
    page: number
    limit: number
    device_id: number
    direction?: "rx" | "tx"
    is_alarm?: number
  }

  export interface Result {
    err: number
    msg: string
    res: Res
  }

  export interface Res {
    has_more: number
    next_page: number
    total: number
    list: ConfigItem[]
  }
}

declare namespace API_PostLibiioDeviceConfigSave {
  export interface ConfigItem {
    id?: number
    device_id: number
    type?: "rx" | "tx"
    sort?: number
    target_freq_mhz: number
    power_offset_db?: number | string
    power_w?: number | string
    rssi_dbm?: number | string
    direction?: "rx" | "tx"
    is_alarm: number | string
    is_maintaining?: number | string
    min?: number
    max?: number
  }

  export interface BatchParams {
    device_id: number
    direction?: "rx" | "tx"
    list: ConfigItem[]
  }

  export type Params = ConfigItem | BatchParams

  export interface Result {
    err: number
    msg: string
    res: any
  }
}

declare namespace API_PostLibiioDeviceConfigDelete {
  export interface Params {
    id: number
  }

  export interface Result {
    err: number
    msg: string
    res: any
  }
}

declare namespace API_PostLibiioBoardList {
  export type ModuleDirection = "rx" | "tx"

  export interface Params {
    page?: number
    limit?: number
    device_id?: number
    ip?: string
    direction?: ModuleDirection
    type?: ModuleDirection
  }

  export interface Channel {
    channel_no: number
    configured: boolean
    is_maintaining?: boolean
    target_freq_mhz?: number | null
    metric_value?: number | string | null
    alarm_enabled?: number | string | boolean
    alarm_status?: number | null
    status_text?: string
    is_alarm?: number | string
    min?: number | string
    max?: number | string
    power_w?: number | string
    rssi_dbm?: number | string
  }

  export interface Module {
    direction: ModuleDirection
    ip?: string
    title?: string
    title_key?: string
    metric_key?: string
    metric_label?: string
    metric_label_key?: string
    metric_unit?: string
    is_online?: number | string | boolean
    online?: number | string | boolean
    status?: string
    status_key?: string
    status_text?: string
    channels: Channel[]
  }

  export interface List {
    device_id: number
    ip?: string
    isolation_db?: number | string | null
    isolation_db_alarm_min?: number | string | null
    isolation_db_alarm_max?: number | string | null
    isolation_db_alarm_enabled?: number | string | boolean | null
    isolation_db_is_alarm?: number | string | boolean | null
    tx_vswr?: number | string | null
    tx_vswr_alarm_min?: number | string | null
    tx_vswr_alarm_max?: number | string | null
    tx_vswr_alarm_enabled?: number | string | boolean | null
    tx_vswr_is_alarm?: number | string | boolean | null
    tx_reverse_power_dbm?: number | string | null
    modules: Module[]
  }

  export interface Result {
    err: number
    msg: string
    res: {
      has_more?: number
      next_page?: number
      total?: number
      list: List[]
    }
  }
}

declare namespace API_PostLibiioDeviceSave {
  export interface OutputFrequencyConfig {
    name?: string
    frequency_mhz?: number
  }

  export interface Params {
    id?: number
    ip?: string
    type?: number
    center_freq: number
    sampling_rate: number
    fft_size: number
    full_scale_power_dbm?: number
    tx_power_offset_db?: number
    tx_hardware_gain_db?: number
    rx_rssi_offset_db?: number
    rx_hardware_gain_db?: number
    rx_ip?: string
    rx_center_freq?: number
    rx_sampling_rate?: number
    rx_fft_size?: number
    tx_ip?: string
    tx_center_freq?: number
    tx_sampling_rate?: number
    tx_fft_size?: number
  }

  export interface Result {
    err: number
    msg: string
    res: {
      id: number
    }
  }
}

declare namespace API_PostLibiioDeviceModuleIPUpdate {
  export interface Params {
    id: number
    direction: "rx" | "tx"
    ip: string
  }

  export interface Result {
    err: number
    msg: string
    res: {
      id: number
    }
  }
}

declare namespace API_PostDeviceCreate {
  export interface Result {
    err: number
    msg: string
    res: any
  }
}
declare namespace API_PostDeviceUpdate {
  export interface Result {
    err: number
    msg: string
    res: any
  }
}

declare namespace API_PostToggleMaintaining {
  export interface Result {
    err: number
    msg: string
    res: any
  }
}

declare namespace API_PostDeviceTypes {
  export interface Result {
    err: number
    msg: string
    msg_key?: string
    res_key?: string
    res: Res
  }

  export interface Res {
    list: List[]
    total: number
  }

  export interface List {
    id: number
    device_type_group: string
    device_type_group_key?: string
    device_type: string
    device_type_alias: string
    device_type_alias_key?: string
    configs: Configs[]
    alarms: Alarms[]
    shows: Shows[]
  }
  export interface Configs {
    config_type: number
    config_type_name: string
    config_type_key?: string
    alarm_operator: string
    val: number
    alarm_min?: number | null
    alarm_max?: number | null
    show_min?: number | null
    show_max?: number | null
    min: number
    max: number
    unit: string
    sort: number
    is_module: boolean
    is_alarm: boolean
  }
  export interface Alarms {
    config_type: number
    config_type_name: string
    config_type_key?: string
    is_selected: boolean
  }
  export interface Shows {
    config_type: number
    config_type_name: string
    config_type_key?: string
    is_show_in_list: boolean
    is_show_in_detail: boolean
  }
}

declare namespace API_PostTopologyData {
  export interface Result {
    err: number
    msg: string
    res: {
      nodes: Nodes[]
      edges: Edges[]
    }
  }
  export interface Nodes {
    id: string
    name: string
    type: string
    status: number
  }

  export interface Edges {
    source: string
    target: string
    relation: string
  }
}

declare namespace API_PostDeviceTypeSave {
  export interface Result {
    err: number
    msg: string
    res: any
  }
}
declare namespace API_PostSaveTopologyData {
  export interface Result {
    err: number
    msg: string
    res: any
  }
}

declare namespace API_PostDeviceTypeConfigSaveData {
  export interface Result {
    err: number
    msg: string
    res: any
  }
}

declare namespace API_PostDeviceTypeAlarmSaveData {
  export interface Result {
    err: number
    msg: string
    res: any
  }
}

declare namespace API_PostDeviceTypeShowSaveData {
  export interface Result {
    err: number
    msg: string
    res: any
  }
}

declare namespace API_PostLogList {
  export interface Result {
    err: number
    msg: string
    res: Res
  }

  export interface Res {
    has_more: number
    next_page: number
    total: number
    list: List[]
  }

  export interface List {
    id: number
    device_id: number
    device_type_id: number
    device_name: string
    device_type: string
    device_type_alias: string
    device_type_alias_key?: string
    status: number
    content: string
    event_code?: string
    event_params?: Record<string, string | number | boolean | null | undefined>
    created_at: number | string
  }
}

declare namespace API_PostDailyXlsxList {
  export interface Result {
    err: number
    msg: string
    res: Res
  }
  export interface Res {
    has_more: number
    next_page: number
    total: number
    list: List[]
  }

  export interface List {
    id: number
    device_id: number
    device_name: string
    file_date: string
    file_name: string
  }
}

export namespace API_PostDeviceDailyXlsxDownload {
  export interface Result {
    err: number
    msg: string
    res: Res
  }
}

export namespace API_PostDeleteDailyXlsx {
  export interface Result {
    err: number
    msg: string
    res: Res
  }
}

export namespace API_PostSyncPanelInfo {
  export interface Result {
    err: number
    msg: string
    res: Res
  }
  export interface Res {
    success_count: number
    fail_count: number
  }
}

export namespace API_PostRFConfig {
  export interface Result {
    err: number
    msg: string
    res: Res
  }
  export interface Res {
    uplink_power: number
    uplink_power_min: number
    uplink_power_max: number
    is_set_uplink_power: boolean
    uplink_gain: number
    uplink_gain_min: number
    uplink_gain_max: number
    is_set_uplink_gain: boolean
    downlink_power: number
    downlink_power_min: number
    downlink_power_max: number
    is_set_downlink_power: boolean
    downlink_gain: number
    downlink_gain_min: number
    downlink_gain_max: number
    is_set_downlink_gain: boolean
    is_set_same_frequency_forward_switch: boolean
    same_frequency_forward_switch: number
    is_set_downlink_switch: boolean
    downlink_switch: number
    is_set_uplink_switch: boolean
    uplink_switch: number
    is_set_pa4_alarm_switch: boolean
    pa4_alarm_switch: number
  }
}

export namespace API_PostDeleteDevice {
  export interface Params {
    device_id: number
  }
  export interface Result {
    err: number
    msg: string
    res: any
  }
}

export namespace API_PostDeviceMove {
  export interface Params {
    device_id: number
    direction: "up" | "down"
  }
  export interface Result {
    err: number
    msg: string
    res: any
  }
}

export namespace API_PostRFConfigSave {
  export interface Params {
    device_id: number
    current_val: number
    rf_config_type: string
  }
  export interface Result {
    err: number
    msg: string
    res: any
  }
}
