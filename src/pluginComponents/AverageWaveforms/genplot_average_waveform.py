from typing import Dict
import hither as hi
import numpy as np
import kachery as ka
import spikeextractors as se
import spiketoolkit as st
from labbox_ephys import prepare_snippets_h5

@hi.function('createjob_fetch_average_waveform_plot_data', '')
def createjob_fetch_average_waveform_plot_data(labbox, recording_object, sorting_object, unit_id):
    jh = labbox.get_job_handler('partition2')
    jc = labbox.get_default_job_cache()
    with hi.Config(
        job_cache=jc,
        job_handler=jh,
        container=jh.is_remote
    ):
        snippets_h5 = prepare_snippets_h5.run(recording_object=recording_object, sorting_object=sorting_object)
        return fetch_average_waveform_plot_data.run(
            snippets_h5=snippets_h5,
            unit_id=unit_id
        )       

@hi.function('fetch_average_waveform_plot_data', '0.2.1')
@hi.container('docker://magland/labbox-ephys-processing:0.2.18')
@hi.local_modules(['../../../python/labbox_ephys'])
def fetch_average_waveform_plot_data(snippets_h5, unit_id):
    import h5py
    h5_path = ka.load_file(snippets_h5)
    with h5py.File(h5_path, 'r') as f:
        unit_ids = np.array(f.get('unit_ids'))
        sampling_frequency = np.array(f.get('sampling_frequency'))[0]
        unit_spike_train = np.array(f.get(f'unit_spike_trains/{unit_id}'))
        unit_waveforms = np.array(f.get(f'unit_waveforms/{unit_id}/waveforms'))
        unit_waveforms_channel_ids = np.array(f.get(f'unit_waveforms/{unit_id}/channel_ids'))
        print(unit_waveforms_channel_ids)
    
    average_waveform = np.median(unit_waveforms, axis=0)
    channel_maximums = np.max(np.abs(average_waveform), axis=1)
    maxchan_index = np.argmax(channel_maximums)
    maxchan_id = unit_waveforms_channel_ids[maxchan_index]

    return dict(
        channel_id=int(maxchan_id),
        average_waveform=average_waveform[maxchan_index, :].astype(float).tolist()
    )

@hi.function('old_fetch_average_waveform_plot_data', '0.1.14')
@hi.container('docker://magland/labbox-ephys-processing:0.2.18')
@hi.local_modules(['../../../python/labbox_ephys'])
def old_fetch_average_waveform_plot_data(recording_object, sorting_object, unit_id):
    import labbox_ephys as le
    R = le.LabboxEphysRecordingExtractor(recording_object)
    S = le.LabboxEphysSortingExtractor(sorting_object)

    start_frame = 0
    end_frame = R.get_sampling_frequency() * 30
    R0 = se.SubRecordingExtractor(parent_recording=R, start_frame=start_frame, end_frame=end_frame)
    S0 = se.SubSortingExtractor(parent_sorting=S, start_frame=start_frame, end_frame=end_frame)

    times0 = S0.get_unit_spike_train(unit_id=unit_id)
    if len(times0) == 0:
        # no waveforms found
        return dict(
            channel_id=None,
            average_waveform = None
        )
    try:
        average_waveform = st.postprocessing.get_unit_templates(
            recording=R0,
            sorting=S0,
            unit_ids=[unit_id]
        )[0]
    except:
        raise Exception(f'Error getting unit templates for unit {unit_id}')

    channel_maximums = np.max(np.abs(average_waveform), axis=1)
    maxchan_index = np.argmax(channel_maximums)
    maxchan_id = R0.get_channel_ids()[maxchan_index]

    return dict(
        channel_id=maxchan_id,
        average_waveform=average_waveform[maxchan_index, :].tolist()
    )
