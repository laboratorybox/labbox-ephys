// LABBOX-EXTENSION: electrodegeometry
// LABBOX-EXTENSION-TAGS: jupyter

import React, { FunctionComponent, useState } from 'react';
import { ExtensionContext, RecordingViewProps, SortingViewProps } from "../extensionInterface";
import ElectrodeGeometryWidget from './ElectrodeGeometryWidget/ElectrodeGeometryWidget';

const zipElectrodes = (locations: number[][], ids: number[]) => {
    if (locations && ids && ids.length !== locations.length) throw Error('Electrode ID count does not match location count.')
    return ids.map((x, index) => {
        const loc = locations[index]
        return { label: x + '', x: loc[0], y: loc[1] }
    })
}

const ElectrodeGeometryRecordingView: FunctionComponent<RecordingViewProps> = ({recording}) => {
    const ri = recording.recordingInfo
    const electrodes = ri ? zipElectrodes(ri.geom, ri.channel_ids) : []
    const [selectedElectrodeIds, setSelectedElectrodeIds] = useState<number[]>([]);
    if (!ri) {
        return (
            <div>No recording info found for recording.</div>
        )
    }
    return (
        <ElectrodeGeometryWidget
            electrodes={electrodes}
            selectedElectrodeIds={selectedElectrodeIds}
            onSelectedElectrodeIdsChanged={(x) => setSelectedElectrodeIds(x)}
            width={350}
            height={150}
        />
    );
}

const ElectrodeGeometrySortingView: FunctionComponent<SortingViewProps> = ({recording, hither}) => {
    return (
        <ElectrodeGeometryRecordingView
            recording={recording}
            hither={hither}
        />
    )
}

export function activate(context: ExtensionContext) {
    context.registerRecordingView({
        name: 'ElectrodeGeometryRecordingView',
        label: 'Electrode geometry',
        priority: 50,
        defaultExpanded: true,
        component: ElectrodeGeometryRecordingView
    })
    context.registerSortingView({
        name: 'ElectrodeGeometrySortingView',
        label: 'Electrode geometry',
        priority: 50,
        component: ElectrodeGeometrySortingView
    })
}