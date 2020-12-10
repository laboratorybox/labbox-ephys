import React from 'react';
import { SortingUnitMetricPlugin } from '../../../extensionInterface';

const IsiViolations = React.memo((a: {record: number}) => {
    return (
        <span>{a.record.toFixed(4)}</span>
    );
})

const getRecordValue = (record: any) => {
    return { 
        numericValue: record ? record as number : NaN, 
        stringValue: '',
        isNumeric: true
    }
}

const plugin: SortingUnitMetricPlugin = {
    name: 'IsiViolations',
    label: 'ISI viol.',
    columnLabel: 'ISI viol.',
    tooltip: 'ISI violation rate',
    hitherFnName: 'createjob_get_isi_violation_rates',
    metricFnParams: {
        'isi_threshold_msec': 2.5
        // need to sort out how to pass unit ids list?
    },
    hitherConfig: {
        auto_substitute_file_objects: true,
        wait: true,
        newHitherJobMethod: true,
        useClientCache: true
    },
    component: IsiViolations,
    getRecordValue: getRecordValue
}

export default plugin