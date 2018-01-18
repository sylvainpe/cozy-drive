import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { flowRight as compose } from 'lodash'

import { Spinner, translate } from 'cozy-ui/react'
import styles from './styles'
import Viewer from 'viewer'
import { fetchDocument, getDocument } from 'cozy-client'

const doNothing = () => {}

class FileOpener extends Component {
  state = { loading: true }
  componentWillMount() {
    this.loadFileInfo()
  }

  async loadFileInfo() {
    const { alert } = this.props
    try {
      await this.props.fetchFile()
      // Go to the parent folder, we replace since we do not want
      // to add a new history entry
      // router.replace(`/folder/${fileInfo.attributes.dir_id}/file/${fileId}`)
    } catch (e) {
      console.warn(e)
      // Go to the root folder, we replace since we do not want
      // to add a new history entry
      alert({
        message: 'alert.could_not_open_file'
      })
    } finally {
      this.setState({ loading: false })
    }
  }

  render() {
    const { file } = this.props
    const { loading } = this.state
    if (file) {
      console.log('✅ Found file in store', file)
    } else {
      console.log('❌ Cannot find file in store')
    }
    return (
      <div className={styles.fileOpener}>
        {loading ? (
          <Spinner size="xxlarge" loadingType="message" middle />
        ) : (
          <Viewer
            files={[file]}
            currentIndex={0}
            onClose={doNothing}
            onChange={doNothing}
          />
        )}
      </div>
    )
  }
}

const getFileId = ownProps => {
  return ownProps.router.params.fileId
}

const mapDispatchToProps = (dispatch, ownProps) => ({
  alert: data => dispatch({ type: 'ALERT', alert: data }),
  fetchFile: async id => {
    return dispatch(fetchDocument('io.cozy.files', getFileId(ownProps)))
  }
})

const mapStateToProps = (state, ownProps) => ({
  file: getDocument(state, 'io.cozy.files', getFileId(ownProps))
})

FileOpener.PropTypes = {
  router: PropTypes.shape({
    params: PropTypes.shape({
      fileId: PropTypes.string.isRequired
    }).isRequired
  }).isRequired
}

export default compose(
  translate(),
  connect(mapStateToProps, mapDispatchToProps)
)(FileOpener)
