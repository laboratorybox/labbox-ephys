import { Button, CircularProgress, Paper } from '@material-ui/core';
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import MultiComboBox from '../../components/MultiComboBox';
import { createHitherJob } from '../../hither';
import { Recording } from '../../reducers/recordings';
import { Sorting } from '../../reducers/sortings';
import sampleSortingViewProps from '../common/sampleSortingViewProps';
import * as pluginComponents from './metricPlugins';
import { MetricPlugin } from './metricPlugins/common';
import UnitsTable from './UnitsTable';

const defaultLabelOptions = ['noise', 'MUA', 'artifact', 'accept', 'reject'];

const metricPlugins: MetricPlugin[] = Object.values(pluginComponents)
                            .filter(plugin => {
                                const p = plugin as any
                                return (p.type === 'metricPlugin')
                            })
                            .map(plugin => {
                                return plugin as MetricPlugin
                            })

type Status = 'waiting' | 'completed' | 'executing' | 'error'

type MetricDataState = {[key: string]: {
    status: Status
    data: any | null
    error: string | null
}}

const initialMetricDataState: MetricDataState = {}

interface MetricDataAction {
    metricName: string
    status: Status
    data?: any
    error?: string
}

const updateMetricData = (state: MetricDataState, action: MetricDataAction): MetricDataState => {
    const { metricName, status, data, error } = action
    if (state[metricName] && state[metricName].status === 'completed') {
        console.warn(`Updating status of completed metric ${metricName}??`);
        return state;
    }
    return {
        ...state,
        [metricName]: {
            'status': status,
            'data': status === 'completed' ? data || null : null,
            'error': status === 'error' ? error || null : null
        }
    }
}

type Label = string

interface Props {
    sorting: Sorting
    recording: Recording
    selectedUnitIds: {[key: string]: boolean}
    extensionsConfig: {enabled: {[key: string]: boolean}}
    onAddUnitLabel: (a: {sortingId: string, unitId: number, label: Label}) => void
    onRemoveUnitLabel: (a: {sortingId: string, unitId: number, label: Label}) => void
    onSelectedUnitIdsChanged: (s: {[key: string]: boolean}) => void
    readOnly: boolean
}

const Units: React.FunctionComponent<Props> = (props) => {
    const { extensionsConfig, sorting, recording, selectedUnitIds, onAddUnitLabel, onRemoveUnitLabel, onSelectedUnitIdsChanged, readOnly } = props
    const [activeOptions, setActiveOptions] = useState([]);
    const [expandedTable, setExpandedTable] = useState(false);
    const [metrics, updateMetrics] = useReducer(updateMetricData, initialMetricDataState);
    const activeMetricPlugins = metricPlugins.filter(
        p => (!p.development || (extensionsConfig.enabled.development)));

    const labelOptions = [...new Set(
        defaultLabelOptions.concat(
            Object.keys(sorting.unitCuration || {})
                .reduce(
                    (allLabels: Label[], unitId: string) => {
                        const u = (sorting.unitCuration)[unitId]
                        return allLabels.concat(u.labels || [])
                    }, [])
        )
    )].sort((a, b) => {
        // note this will sort numbers like strings. If that's a problem, we
        // might need a more sophisticated solution.
        const aUpper = a.toUpperCase();
        const bUpper = b.toUpperCase();
        if (aUpper < bUpper) return -1;
        if (aUpper > bUpper) return 1;
        if (a < b) return -1;
        if (b > a) return 1;
        return 0;
    });

    const fetchMetric = useCallback(async (metric = {metricName: '', hitherFnName: '',
                                                    metricFnParams: {}, hitherConfig: {}}) => {
        const name = metric.metricName;

        if (name in metrics) {
            return metrics[name];
        }
        // TODO: FIXME! THIS STATE IS NOT PRESERVED BETWEEN UNFOLDINGS!!!
        // TODO: May need to bump this up to the parent!!!
        // new request. Add state to cache, dispatch job, then update state as results come back.
        updateMetrics({metricName: metric.metricName, status: 'executing'})
        try {
            const data = await createHitherJob(metric.hitherFnName,
                {
                    sorting_object: sorting.sortingObject,
                    recording_object: recording.recordingObject,
                    configuration: metric.metricFnParams
                },
                {
                    ...metric.hitherConfig,
                    required_files: sorting.sortingObject
                });
            updateMetrics({metricName: metric.metricName, status: 'completed', data})
        } catch (err) {
            console.error(err);
            updateMetrics({metricName: metric.metricName, status: 'error', error: err.message})
        }
    }, [metrics, sorting.sortingObject, recording.recordingObject]);

    useEffect(() => { 
        activeMetricPlugins.forEach(async mp => await fetchMetric(mp));
    }, [activeMetricPlugins, metrics, fetchMetric]);


    const selectedRowKeys = sorting.sortingInfo.unit_ids
        .reduce((obj, id) => ({...obj, [id]: selectedUnitIds[id] || false}), {});

    const handleAddLabel = (unitId: number, label: Label) => {
        onAddUnitLabel({sortingId: sorting.sortingId, unitId: unitId, label: label})
    }
    const handleRemoveLabel = (unitId: number, label: Label) => {
        onRemoveUnitLabel({sortingId: sorting.sortingId, unitId: unitId, label: label})
    }
    const handleApplyLabels = (selectedRowKeys: {[key: string]: any}, labels: Label[]) => {
        Object.keys(selectedRowKeys).forEach((key) => selectedRowKeys[key]
            ? labels.forEach((label) => handleAddLabel(Number(key), label))
            : {});
    };
    const handlePurgeLabels = (selectedRowKeys: {[key: string]: any}, labels: Label[]) => {
        Object.keys(selectedRowKeys).forEach((key) => selectedRowKeys[key]
            ? labels.forEach((label) => handleRemoveLabel(Number(key), label))
            : {});
    };

    let units = sorting.sortingInfo.unit_ids;
    let showExpandButton = false;
    if ((!expandedTable) && (units.length > 30)) {
        units = units.slice(0, 30);
        showExpandButton = true;
    }

    // TODO: define additional columns such as: num. events, avg. firing rate, snr, ...
    if (Object.keys(metrics).length === 0 ) { // empty object
        return (
            <div style={{'width': '100%'}}>
                <CircularProgress />
            </div>
        );
    }
    return (
        <div style={{'width': '100%'}}>
            <Paper style={{maxHeight: 350, overflow: 'auto'}}>
                <UnitsTable 
                    metricPlugins={activeMetricPlugins}
                    units={units}
                    metrics={metrics}
                    selectedUnitIds={selectedUnitIds}
                    sorting={sorting}
                    onSelectedUnitIdsChanged={onSelectedUnitIdsChanged}
                />
                {
                    showExpandButton && (
                        <Button onClick={() => {setExpandedTable(true)}}>Show all units</Button>
                    )
                }
            </Paper>
            {
                (!readOnly) && (
                    <div>
                        <MultiComboBox
                            id="label-selection"
                            label='Choose labels'
                            placeholder='Add label'
                            onSelectionsChanged={(event: any, value: any) => setActiveOptions(value)}
                            options={labelOptions}
                        />
                        <Button onClick={() => handleApplyLabels(selectedRowKeys, activeOptions)}>Apply selected labels</Button>
                        <Button onClick={() => handlePurgeLabels(selectedRowKeys, activeOptions)}>Remove selected labels</Button>
                    </div>
                )
            }
        </div>
    );
}

const label = 'Units Table'

const U = Units as any as (React.Component & {sortingViewPlugin: any, prototypeViewPlugin: any})

U.sortingViewPlugin = {
    label: label
}

U.prototypeViewPlugin = {
    label: label,
    props: sampleSortingViewProps()
}

export default U