const text: string = "# Load this sorting using Python\n\n**See below for prerequisites**\n\n## Loading into a SpikeInterface sorting extractor\n\n```python\nimport labbox_ephys as le\n\nsorting_path = '<SORTING_PATH>'\n\nsorting = le.LabboxEphysSortingExtractor(sorting_path)\n\n# sorting is a SpikeInterface sorting extractor\n# print the unit IDs\nunit_ids = sorting.get_unit_ids()\nprint(f'Unit IDs: {unit_ids}\\n')\n\n# get a spike train for the first unit\nunit_id = unit_ids[0]\nspike_train = sorting.get_unit_spike_train(unit_id=unit_id)\nprint(f'Unit {unit_id} has {len(spike_train)} events\\n')\n```\n\n## Prerequisites\n\n### kachery-p2p daemon\n\nIn order to retrieve the data from the distributed network you must have a kachery-p2p daemon running\nand be connected to the appropriate channel. See [kachery-p2p](https://github.com/flatironinstitute/kachery-p2p).\n\n\n### Labbox-ephys Python package\n\nInstall the labbox-ephys Python package from source\n\n```bash\ngit clone https://github.com/laboratorybox/labbox-ephys\ncd labbox-ephys/python\npip install -e .\n```\n\nFor subsequent updates:\n\n```bash\ncd labbox-ephys\ngit pull\ncd python\npip install -e .\n```\n\n"

export default text