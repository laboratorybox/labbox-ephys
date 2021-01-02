import { Reducer, useEffect, useState } from "react"
import { useOnce } from "./common/hooks"
import { sleepMsec } from "./common/misc"

export interface Sorting {
    sortingId: string
    sortingLabel: string
    sortingPath: string
    sortingObject: any
    recordingId: string
    recordingPath: string
    recordingObject: any
    externalUnitMetricsUri?: string

    sortingInfo?: SortingInfo
    externalUnitMetrics?: ExternalSortingUnitMetric[]
    curation?: SortingCuration
}

export type Label = string

export type ExternalSortingUnitMetric = {name: string, label: string, tooltip?: string, data: {[key: string]: number}}

export interface SortingInfo {
    unit_ids: number[]
    samplerate: number
}

export interface RecordingInfo {
    sampling_frequency: number
    channel_ids: number[]
    channel_groups: number[]
    geom: (number[])[]
    num_frames: number
    noise_level: number
}

export interface Recording {
    recordingId: string
    recordingLabel: string
    recordingObject: any
    recordingPath: string
    recordingInfo: RecordingInfo
    fetchingRecordingInfo?: boolean // internal
}

export interface LabboxPlugin {
    name: string
    label: string
    priority?: number
    disabled?: boolean
    development?: boolean
    icon?: JSX.Element
}

export interface ViewPlugin extends LabboxPlugin {
    props?: {[key: string]: any}
    fullWidth?: boolean
    defaultExpanded?: boolean
    singleton?: boolean
}

export interface MetricPlugin extends LabboxPlugin {
    
}

// Sorting curation
export type SortingCuration = {
    labelsByUnit?: {[key: string]: string[]}
    labelChoices?: string[]
    mergeGroups?: (number[])[]
}

export type SortingCurationDispatch = (action: SortingCurationAction) => void

type SetCurationSortingCurationAction = {
    type: 'SetCuration',
    curation: SortingCuration
}

type AddLabelSortingCurationAction = {
    type: 'AddLabel',
    unitId: number
    label: string
}

type RemoveLabelSortingCurationAction = {
    type: 'RemoveLabel',
    unitId: number
    label: string
}
type MergeUnitsSortingCurationAction = {
    type: 'MergeUnits',
    unitIds: number[]
}
type UnmergeUnitsSortingCurationAction = {
    type: 'UnmergeUnits',
    unitIds: number[]
}

export type SortingCurationAction = SetCurationSortingCurationAction | AddLabelSortingCurationAction | RemoveLabelSortingCurationAction | MergeUnitsSortingCurationAction | UnmergeUnitsSortingCurationAction

const intersection = (a: number[], b: number[]) => (
    a.filter(x => (b.includes(x)))
)
const union = (a: number[], b: number[]) => (
    [...a, ...b.filter(x => (!a.includes(x)))].sort()
)

const simplifyMergeGroups = (mg: (number[])[]): (number[])[] => {
    const newMergeGroups = mg.map(g => [...g]) // make a copy
    let somethingChanged = true
    while (somethingChanged) {
        somethingChanged = false
        for (let i = 0; i < newMergeGroups.length; i ++) {
            const g1 = newMergeGroups[i]
            for (let j = i + 1; j < newMergeGroups.length; j ++) {
                const g2 = newMergeGroups[j]
                if (intersection(g1, g2).length > 0) {
                    newMergeGroups[i] = union(g1, g2)
                    newMergeGroups[j] = []
                    somethingChanged = true
                }
            }
        }
    }
    return newMergeGroups.filter(g => (g.length >= 2))
}

export const mergeGroupForUnitId = (unitId: number, sorting: Sorting) => {
    const mergeGroups = (sorting.curation || {}).mergeGroups || []
    return mergeGroups.filter(g => (g.includes(unitId)))[0] || null
}

// This reducer is used by the jupyter widget, but not by the web gui. That's because the web gui uses the global redux state to dispatch the curation actions.
export const sortingCurationReducer: Reducer<SortingCuration, SortingCurationAction> = (state: SortingCuration, action: SortingCurationAction): SortingCuration => {
    if (action.type === 'SetCuration') {
        return action.curation
    }
    else if (action.type === 'AddLabel') {
        const uid = action.unitId + ''
        const labels = (state.labelsByUnit || {})[uid] || []
        if (!labels.includes(action.label)) {
            return {
                ...state,
                labelsByUnit: {
                    ...state.labelsByUnit,
                    [uid]: [...labels, action.label].sort()
                }
            }
        }
        else return state
    }
    else if (action.type === 'RemoveLabel') {
        const uid = action.unitId + ''
        const labels = (state.labelsByUnit || {})[uid] || []
        if (labels.includes(action.label)) {
            return {
                ...state,
                labelsByUnit: {
                    ...state.labelsByUnit,
                    [uid]: labels.filter(l => (l !== action.label))
                }
            }
        }
        else return state
    }
    else if (action.type === 'MergeUnits') {
        return {
            ...state,
            mergeGroups: simplifyMergeGroups([...(state.mergeGroups || []), action.unitIds])
        }
    }
    else if (action.type === 'UnmergeUnits') {
        return {
            ...state,
            mergeGroups: simplifyMergeGroups((state.mergeGroups || []).map(g => (g.filter(x => (!action.unitIds.includes(x))))))
        }
    }
    else return state
}
////////////////////

// This reducer is used only by the jupyter extension
type SetExternalUnitMetricsAction = {
    type: 'SetExternalUnitMetrics',
    externalUnitMetrics: ExternalSortingUnitMetric[]
}
type ExternalUnitMetricsAction = SetExternalUnitMetricsAction
export const externalUnitMetricsReducer: Reducer<ExternalSortingUnitMetric[], ExternalUnitMetricsAction> = (state: ExternalSortingUnitMetric[], action: ExternalUnitMetricsAction): ExternalSortingUnitMetric[] => {
    if (action.type === 'SetExternalUnitMetrics') {
        return action.externalUnitMetrics
    }
    else return state
}
////////////////////////////////

// Recording selection
export interface RecordingSelection {
    selectedElectrodeIds?: number[]
    currentTimepoint?: number
    timeRange?: {min: number, max: number} | null
    ampScaleFactor?: number
    animation?: {
        lastUpdateTimestamp: number
        currentTimepointVelocity: number // timepoints per second
    }
}

export const useRecordingAnimation = (selection: RecordingSelection, selectionDispatch: RecordingSelectionDispatch) => {
    const [animationFrame, setAnimationFrame] = useState(0)
    const [prevAnimationFrame, setPrevAnimationFrame] = useState(0)
    useEffect(() => {
        if (prevAnimationFrame !== animationFrame) {
            setPrevAnimationFrame(animationFrame)
            if (selection?.animation?.currentTimepointVelocity) {
                selectionDispatch({type: 'AnimateRecording'})
            }
        }
    }, [animationFrame, selection, selectionDispatch, prevAnimationFrame, setPrevAnimationFrame])

    // only do this once
    useOnce(() => {
        ;(async () => {
            let i = 0
            while (true) {
                setAnimationFrame(i)
                i ++
                await sleepMsec(50)
            }
        })()
    })
}

export type RecordingSelectionDispatch = (action: RecordingSelectionAction) => void

type SetRecordingSelectionRecordingSelectionAction = {
    type: 'SetRecordingSelection',
    recordingSelection: RecordingSelection
}

type SetSelectedElectrodeIdsRecordingSelectionAction = {
    type: 'SetSelectedElectrodeIds',
    selectedElectrodeIds: number[]
}

type SetCurrentTimepointRecordingSelectionAction = {
    type: 'SetCurrentTimepoint',
    currentTimepoint: number | null
}

type SetTimeRangeRecordingSelectionAction = {
    type: 'SetTimeRange',
    timeRange: {min: number, max: number} | null
}

type SetAmpScaleFactorRecordingSelectionAction = {
    type: 'SetAmpScaleFactor',
    ampScaleFactor: number
}

type ScaleAmpScaleFactorRecordingSelectionAction = {
    type: 'ScaleAmpScaleFactor',
    multiplier: number
}

type SetCurrentTimepointVelocityRecordingSelectionAction = {
    type: 'SetCurrentTimepointVelocity',
    velocity: number // timepoints per second
}

type AnimateRecordingSelectionAction = {
    type: 'AnimateRecording'
}

export type RecordingSelectionAction = SetRecordingSelectionRecordingSelectionAction | SetSelectedElectrodeIdsRecordingSelectionAction | SetCurrentTimepointRecordingSelectionAction | SetTimeRangeRecordingSelectionAction | SetAmpScaleFactorRecordingSelectionAction | ScaleAmpScaleFactorRecordingSelectionAction | SetCurrentTimepointVelocityRecordingSelectionAction | AnimateRecordingSelectionAction

export const recordingSelectionReducer: Reducer<RecordingSelection, RecordingSelectionAction> = (state: RecordingSelection, action: RecordingSelectionAction): RecordingSelection => {
    if (action.type === 'SetRecordingSelection') {
        return {...action.recordingSelection}
    }
    else if (action.type === 'SetSelectedElectrodeIds') {
        return {
            ...state,
            selectedElectrodeIds: action.selectedElectrodeIds
        }
    }
    else if (action.type === 'SetCurrentTimepoint') {
        return {
            ...state,
            currentTimepoint: action.currentTimepoint || undefined
        }
    }
    else if (action.type === 'SetTimeRange') {
        return {
            ...state,
            timeRange: action.timeRange
        }
    }
    else if (action.type === 'SetAmpScaleFactor') {
        return {
            ...state,
            ampScaleFactor: action.ampScaleFactor
        }
    }
    else if (action.type === 'ScaleAmpScaleFactor') {
        return {
            ...state,
            ampScaleFactor: (state.ampScaleFactor || 1) * action.multiplier
        }
    }
    else if (action.type === 'SetCurrentTimepointVelocity') {
        return {
            ...state,
            animation: {
                ...(state.animation || {}),
                lastUpdateTimestamp: Number(new Date()),
                currentTimepointVelocity: action.velocity
            }
        }
    }
    else if (action.type === 'AnimateRecording') {
        const lastUpdate = state?.animation?.lastUpdateTimestamp || Number(new Date())
        const current = Number(new Date())
        const elapsed = current - lastUpdate
        if (elapsed !== 0) {
            let state2 = {...state}
            const currentTimepointVelocity = state?.animation?.currentTimepointVelocity || 0
            const currentTimepoint = state.currentTimepoint
            let somethingChanged = false
            if ((currentTimepointVelocity) && (currentTimepoint !== undefined)) {
                somethingChanged = true
               state2 = {
                   ...state2,
                   currentTimepoint: Math.round(currentTimepoint + currentTimepointVelocity * (elapsed / 1000))
               } 
            }
            if (somethingChanged) {
                return {
                    ...state2,
                    animation: {
                        ...(state2?.animation || {currentTimepointVelocity: 0}),
                        lastUpdateTimestamp: current
                    }
                }
            }
            else return state
        }
        else return state
    }
    else return state
}
////////////////////

// Sorting selection
export interface SortingSelection extends RecordingSelection {
    selectedUnitIds?: number[]
    visibleUnitIds?: number[] | null // null means all are selected
}

export type SortingSelectionDispatch = (action: SortingSelectionAction) => void

type SetSelectionSortingSelectionAction = {
    type: 'SetSelection',
    selection: SortingSelection
}

type SetSelectedUnitIdsSortingSelectionAction = {
    type: 'SetSelectedUnitIds',
    selectedUnitIds: number[]
}

type SetVisibleUnitIdsSortingSelectionAction = {
    type: 'SetVisibleUnitIds',
    visibleUnitIds: number[] | null
}

type UnitClickedSortingSelectionAction = {
    type: 'UnitClicked'
    unitId: number
    ctrlKey?: boolean
    shiftKey?: boolean
}

export type SortingSelectionAction = SetSelectionSortingSelectionAction | SetSelectedUnitIdsSortingSelectionAction | SetVisibleUnitIdsSortingSelectionAction | UnitClickedSortingSelectionAction | RecordingSelectionAction

const unitClickedReducer = (state: SortingSelection, action: UnitClickedSortingSelectionAction): SortingSelection => {
    const unitId = action.unitId
    if (action.ctrlKey) {
        if ((state.selectedUnitIds || []).includes(unitId)) {
            return {
                ...state,
                selectedUnitIds: (state.selectedUnitIds || []).filter(uid => (uid !== unitId))
            }
        }
        else {
            return {
                ...state,
                selectedUnitIds: [...(state.selectedUnitIds || []), unitId]
            }
        }
    }
    // todo: restore anchor/shift-select behavior somewhere
    else {
        return {
            ...state,
            selectedUnitIds: [unitId]
        }
    }
}

export const sortingSelectionReducer: Reducer<SortingSelection, SortingSelectionAction> = (state: SortingSelection, action: SortingSelectionAction): SortingSelection => {
    if (action.type === 'SetSelection') {
        return action.selection
    }
    else if (action.type === 'SetSelectedUnitIds') {
        return {
            ...state,
            selectedUnitIds: action.selectedUnitIds
        }
    }
    else if (action.type === 'SetVisibleUnitIds') {
        return {
            ...state,
            visibleUnitIds: action.visibleUnitIds
        }
    }
    else if (action.type === 'UnitClicked') {
        return unitClickedReducer(state, action)
    }
    else {
        return recordingSelectionReducer(state, action)
    }
}
////////////////////

export interface HitherJobOpts {
    useClientCache?: boolean
}

export interface HitherJob {
    jobId: string | null
    functionName: string
    kwargs: {[key: string]: any}
    opts: HitherJobOpts
    clientJobId: string
    result: any
    runtime_info: {[key: string]: any}
    error_message: string | null
    status: string
    timestampStarted: number
    timestampFinished: number | null
    wait: () => Promise<any>
}

export interface HitherContext {
    createHitherJob: (functionName: string, kwargs: {[key: string]: any}, opts: HitherJobOpts) => HitherJob
}

export interface Plugins {
    recordingViews: {[key: string]: RecordingViewPlugin}
    sortingViews: {[key: string]: SortingViewPlugin}
    sortingUnitViews: {[key: string]: SortingUnitViewPlugin}
    sortingUnitMetrics: {[key: string]: SortingUnitMetricPlugin}
}

const filterObject = <T>(x: {[key: string]: T}, filter: (x: T) => boolean): {[key: string]: T} => {
    const ret: {[key: string]: T} = {}
    for (let k in x) {
        if (filter(x[k])) ret[k] = x[k]
    }
    return ret
}
  
export const filterPlugins = (plugins: Plugins): Plugins => {  
    const filter = (v: LabboxPlugin) => ((!v.disabled) && (!v.development))
    return {
        recordingViews: filterObject(plugins.recordingViews, filter),
        sortingViews: filterObject(plugins.sortingViews, filter),
        sortingUnitViews: filterObject(plugins.sortingUnitViews, filter),
        sortingUnitMetrics: filterObject(plugins.sortingUnitMetrics, filter)
    }
}
interface ViewProps {
    plugins: Plugins
    hither: HitherContext
    calculationPool: CalculationPool
    width?: number
    height?: number
}

export interface SortingViewProps extends ViewProps {
    sorting: Sorting
    recording: Recording
    curationDispatch: (action: SortingCurationAction) => void
    selection: SortingSelection
    selectionDispatch: (a: SortingSelectionAction) => void
    readOnly: boolean | null
    plugins: Plugins
    hither: HitherContext
}

export interface SortingViewPlugin extends ViewPlugin {
    component: React.ComponentType<SortingViewProps>
    notebookCellHeight?: number
}

export interface CalculationPool {
    requestSlot: () => Promise<{complete: () => void}>
}

export interface SortingUnitViewProps extends SortingViewProps {
    unitId: number
    selectedSpikeIndex: number | null
    onSelectedSpikeIndexChanged?: (index: number | null) => void
}

export interface SortingUnitViewPlugin extends ViewPlugin {
    component: React.ComponentType<SortingUnitViewProps>
}

export interface RecordingViewProps extends ViewProps {
    recording: Recording
    recordingSelection: RecordingSelection
    recordingSelectionDispatch: RecordingSelectionDispatch
}

export interface RecordingViewPlugin extends ViewPlugin {
    component: React.ComponentType<RecordingViewProps>
}

export interface SortingUnitMetricPlugin extends MetricPlugin {
    columnLabel: string,
    tooltip: string,
    hitherFnName: string,
    metricFnParams: {[key: string]: any},
    hitherOpts: {
        useClientCache?: boolean
    },
    component: (record: any) => JSX.Element,
    isNumeric: boolean,
    getValue: (record: any) => number | string
}

export interface ExtensionContext {
    registerSortingView: (V: SortingViewPlugin) => void
    unregisterSortingView: (name: string) => void
    registerSortingUnitView: (V: SortingUnitViewPlugin) => void
    unregisterSortingUnitView: (name: string) => void
    registerRecordingView: (V: RecordingViewPlugin) => void
    unregisterRecordingView: (name: string) => void
    registerSortingUnitMetric: (M: SortingUnitMetricPlugin) => void
    unregisterSortingUnitMetric: (name: string) => void
}