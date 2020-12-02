// LABBOX-EXTENSION: Autocorrelograms

import React from 'react';
import PlotGrid from '../../components/PlotGrid';
import { ExtensionContext, SortingViewProps } from '../../extension';
import CalculationPool from '../common/CalculationPool';
import Correlogram_rv from '../CrossCorrelograms/Correlogram_ReactVis';

const autocorrelogramsCalculationPool = new CalculationPool({maxSimultaneous: 6});

const AutoCorrelograms: React.FunctionComponent<SortingViewProps> = ({ sorting, selectedUnitIds, focusedUnitId, onUnitClicked }) => {
    return (
        <PlotGrid
            sorting={sorting}
            selections={selectedUnitIds}
            focus={focusedUnitId}
            onUnitClicked={onUnitClicked}
            dataFunctionName={'createjob_fetch_correlogram_plot_data'}
            dataFunctionArgsCallback={(unitId: number) => ({
                sorting_object: sorting.sortingObject,
                unit_x: unitId
            })}
            // use default boxSize
            plotComponent={Correlogram_rv}
            plotComponentArgsCallback={(unitId: number) => ({
                id: 'plot-'+unitId
            })}
            newHitherJobMethod={true}
            calculationPool={autocorrelogramsCalculationPool}
        />
    );
}

export function activate(context: ExtensionContext) {
    context.registerSortingView({
        name: 'Autocorrelograms',
        label: 'Autocorrelograms',
        priority: 100,
        component: AutoCorrelograms
    })
}