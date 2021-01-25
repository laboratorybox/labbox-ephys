import spikeextractors as se
import numpy as np
import labbox_ephys as le
import kachery_p2p as kp

# adjust these values
feed_name = 'labbox-ephys-default'
workspace_name = 'default'
recording_id = 'rec1'
duration_sec = 50 # duration of simulated recording
num_channels = 8 # num. channels in simulated recording
num_units = 5 # num units
seed = 1 # random number generator seed

def prepare_recording_sorting():
    # Simulate a recording (toy example)
    recording, sorting = se.example_datasets.toy_example(duration=duration_sec, num_channels=num_channels, K=num_units, seed=seed)
    R = le.LabboxEphysRecordingExtractor.from_memory(recording, serialize=True, serialize_dtype=np.int16)
    S = le.LabboxEphysSortingExtractor.from_memory(sorting, serialize=True)
    return R, S

recording, sorting_true = prepare_recording_sorting()
sorting_id = recording_id + ':true'
feed = kp.load_feed(feed_name, create=True)
print(f'Feed URI: {feed.get_uri()}')
le.import_recording(feed=feed, workspace_name=workspace_name, recording=recording, recording_id=recording_id)
le.import_sorting(feed=feed, workspace_name=workspace_name, recording=recording, sorting=sorting_true, recording_id=recording_id, sorting_id=sorting_id)