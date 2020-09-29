import React from 'react'
import { connect } from 'react-redux'
import { deleteRecordings, setRecordingInfo } from '../../../../actions';
// import { getRecordingInfo } from '../../../../actions/getRecordingInfo';
import { makeStyles, useTheme } from '@material-ui/core'
import LinearProgress from '@material-ui/core/LinearProgress';
import MaterialTable from 'material-table'
import GetAppIcon from '@material-ui/icons/GetApp';
import DeleteIcon from '@material-ui/icons/Delete';
import SpikeSortingButton from './components/SpikeSortingButton'
import GridActions from './components/GridActions/GridActions';
import SampleRate from './components/SampleRate/SampleRate';
import { Link } from 'react-router-dom';
import { getPathQuery } from '../../../../kachery';

const useStyles = makeStyles((theme) => ({
    progress: {
        width: '100%',
        '& > * + *': {
            marginTop: theme.spacing(2),
        },
    },
    button: ({ darkMode }) => ({
        color: darkMode
            ? theme.palette.colors.white
            : theme.palette.colors.grey
    }),
    link: ({ darkMode }) => ({
        color: darkMode
            ? theme.palette.colors.white
            : theme.palette.primary.main
    })
}))

function getRecordingData(row) {
    if (row.recordingObject) {
        if (row.recordingObject.data.num_frames) {
            const { data: { num_frames, samplerate } } = row.recordingObject ?? {}
            return {
                id: row.recordingId,
                file: row.recordingLabel,
                duration: row.recordingObject ? num_frames / samplerate / 60 : '',
                sampleRate: row.recordingObject ? samplerate : '',
            }
        } else {
            /** we haven't num_frames to calculate duration*/
            const { samplerate } = row.recordingObject.data.params ?? {}
            return {
                id: row.recordingId,
                file: row.recordingLabel,
                duration: ' ',
                sampleRate: row.recordingObject ? samplerate : '',
            }
        }
    } else {
        return {
            id: row.recordingId,
            file: row.recordingLabel,
            duration: row.recordingInfo ? row.recordingInfo.num_frames / row.recordingInfo.sampling_frequency / 60 : '',
            sampleRate: row.recordingInfo ? row.recordingInfo.sampling_frequency : '',
        }
    }
}

const VirtualGrid = ({ recordings, onDeleteRecordings, onSetRecordingInfo, documentInfo }) => {
    const { documentId, feedUri } = documentInfo
    const theme = useTheme()
    const darkMode = theme.palette.type === 'dark'
    const classes = useStyles({ darkMode })
    const rows = recordings.map(getRecordingData)

    /*need to implement action on single row and on bulk actions*/
    //rawData on single actions is an object, on bulk actios it is an array of objects
    const handleDelete = (event, rawData) => {
        return alert("You want to delete " + rawData.file)
    }
    const handleExport = (event, rawData) => alert("You exported " + rawData.file)

    return (
        <MaterialTable
            columns={[
                {
                    title: 'File',
                    field: 'file',
                    align: 'left',
                    render: (rawData) => rawData.file
                        ? (
                            <Link
                                title={"View this recording"}
                                to={`/${documentId}/recording/${rawData.id}${getPathQuery({ feedUri })}`}
                                className={classes.link}
                            >
                                {rawData.file}
                            </Link>
                        )
                        : <LinearProgress />
                },
                { title: 'Upload Date', field: 'uploadRate', align: 'left' },
                {
                    title: 'Sample Rate (Hz)',
                    field: 'sampleRate',
                    align: 'left',
                    render: (rawData) => rawData.sampleRate
                        ? <SampleRate label={rawData.sampleRate} />
                        : <LinearProgress />
                },
                {
                    title: 'Duration (sec)',
                    field: 'duration',
                    align: 'left',
                    render: (rawData) => rawData.duration
                        ? rawData.duration
                        : <LinearProgress />
                },
                { title: 'Status', field: 'status', align: 'left' },
                {
                    title: 'Sorting',
                    field: 'sorting',
                    render: (rawData) =>
                        !rawData.sampleRate
                            ? <LinearProgress />
                            : rawData.sampleRate >= 30000
                                ? <SpikeSortingButton rawData={rawData} />
                                : null
                    ,
                    align: 'center'
                },
                {
                    title: 'Actions',
                    field: 'actions',
                    align: 'center',
                    render: (rawData) => {
                        return <GridActions
                            className={classes.button}
                            handleDelete={onDeleteRecordings}
                            handleExport={handleExport}
                            rawData={rawData}
                        />
                    }
                }
            ]}
            /*need it for bulk actions */
            actions={
                [
                    {
                        icon: () => <GetAppIcon className={classes.button} />,
                        tooltip: 'Export File',
                        onClick: handleExport,
                    },
                    {
                        icon: () => <DeleteIcon className={classes.button} />,
                        tooltip: 'Delete File',
                        onClick: handleDelete,
                    }
                ]}
            options={{
                actionsColumnIndex: -1,
                selection: true,
                sorting: true,
                selectionProps: rawData => ({
                    color: 'primary'
                }),
                maxBodyHeight: 580,
                emptyRowsWhenPaging: false
            }}
            data={rows}
            title="Recording Database"
        />
    )
}

const mapStateToProps = state => ({
    recordings: state.recordings,
    documentInfo: state.documentInfo
})

const mapDispatchToProps = dispatch => ({
    onDeleteRecordings: recordingIds => dispatch(deleteRecordings(recordingIds)),
    onSetRecordingInfo: ({ recordingId, recordingInfo }) => dispatch(setRecordingInfo({ recordingId, recordingInfo }))
})

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(VirtualGrid)
