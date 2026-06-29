(function (){
  let assessmentOptions = null
  let assessment = null
  let processing = false
  let currentData = null
  let expanded = false
  const LONG_OUTPUT_LENGTH = 20000

  const updateProcessing = (status) => {
    processing = status
    refreshResultAndFooter()
  }

  const applyStateInitial = (data) => {
    const {state, result, ...dataWithoutState} = data
    assessment = dataWithoutState.assessment
    assessmentOptions = dataWithoutState.options

    render()
  }

  const applyState = (data) => {
    console.log('assessment iframe applyState', data)
    currentData = data
    if (!assessment) {
      applyStateInitial(data)
      return
    }
    updateCheckButtonText()
    refreshResultAndFooter()
    renderGuidance()
  }

  const onCheck = (event) => {
    event.preventDefault()
    updateProcessing(true)

    window.codioAssessmentsHelper.send(
      window.codioAssessmentsHelper.METHODS.SUBMIT_ANSWER
    )
  }

  const onUnblock = (event) => {
    event.preventDefault()
    codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.UNBLOCK)
  }

  const onReset = (event) => {
    event.preventDefault()
    codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.RESET)
  }

  const renderContent = () => {
    $('.instructions-text').html(assessment.source.settings.instructions)
  }

  const updateVisibility = (el, visible) => {
    visible ? el.removeClass('hide') : el.addClass('hide')
  }

  const updateFooterButtons = () => {
    const assessmentState = getAssessmentState()
    const {teacherInStudentsProject, showModify, isDisabled, canAnswerAgain, answered} = assessmentState

    const checkVisibility = !showModify && assessmentOptions.useSubmitButtons
    const checkBtn = $('.check-button')
    updateVisibility(checkBtn, checkVisibility)
    checkBtn.prop('disabled', isDisabled)

    const unblockVisibility = !teacherInStudentsProject && showModify
    updateVisibility($('.unblock-button'), unblockVisibility)

    const state = processing ? window.codioAssessmentsHelper.States.PROGRESS : currentData?.result?.state
    const resetVisibility = !showModify && answered && assessmentOptions.owner &&
      state !== window.codioAssessmentsHelper.States.PROGRESS && !canAnswerAgain
    updateVisibility($('.reset-button'), resetVisibility)
  }

  const updateCheckButtonText = () => {
    const footerContainer = $('.codio-assessment-footer')
    const {result} = currentData || {}
    const caption = window.codioAssessmentsHelper.getButtonCaption(
      assessmentOptions,
      assessment.source.maxAttemptsCount,
      result?.usedAttempts || 0
    )
    footerContainer.find('.check-button').html(caption)
  }

  const renderGuidance = () => {
    const guidanceBlock = $('.codio-assessment-guidance-block')
    guidanceBlock.empty()
    const assessmentState = getAssessmentState()
    const {result} = currentData || {}
    const guidance = window.codioAssessmentsHelper.calculateGuidance(
      !assessmentOptions.eduStartedAssignment,
      assessmentOptions.showAsTeacher,
      assessmentState.answered,
      assessment.source,
      result ?
        {
          answerGuidance: result.guidance,
          answerPoints: result.points,
          attemptsCount: result.usedAttempts,
          passed: result.state === window.codioAssessmentsHelper.States.PASS,
          isCompletedAndReleased: window.codioAssessmentsHelper.calculateCompletedAndReleased(
            assessmentOptions.eduStartedAssignment
          )
        } : {}
    )
    if (guidance) {
      const guidanceContainer = $('<div class="codio-assessment-guidance-container" />')
      const guidanceText = $('<div class="codio-assessment-guidance-text">').html(guidance)
      guidanceContainer.append(guidanceText)
      guidanceBlock.append(guidanceContainer)
    }
  }

  const onExpandClick = () => {
    const {EXPAND, COLLAPSE} = window.codioAssessmentsHelper.METHODS
    const action = expanded ? COLLAPSE :EXPAND
    expanded = !expanded
    window.codioAssessmentsHelper.send(action)
  }

  const isString = (val) => typeof val === 'string' || val instanceof String

  const renderFeedbackOutput = async (comment, format) => {
    if (!isString(comment)) {
      return null
    }
    if (format === window.codioAssessmentsHelper.SCRIPT_GRADE_FORMAT.MD) {
      try {
        const file = await unified()
          .use(window.remarkParse)
          .use(window.remarkRehype)
          .use(window.rehypeExternalLinks, {rel: [], target: '_blank'})
          .use(window.rehypeSanitize)
          .use(window.rehypeStringify)
          .process(comment)

        return file.value
      } catch (e) {
        console.error(e)
      }
    } else if (format === window.codioAssessmentsHelper.SCRIPT_GRADE_FORMAT.HTML) {
      return window.DOMPurify.sanitize(comment)
    }
    return comment.split('\n').map(item => {
      return `<p>${window.codioAssessmentsHelper.escapeHTML(item)}</p>`
    }).join('')
  }

  const getFeedbackContainer = () => {
    const container = $('<div class="codio-assessment-feedback-container" />')
    container.attr('aria-label', `Scrollable feedback ${assessment.source.showName ? assessment.source.name : ''}`)
    return container
  }

  const getValidHtml = (text) => {
    return new DOMParser().parseFromString(text, 'text/html').querySelector("body").innerHTML
  }

  const cutOutput = (inputText) => {
    return inputText.length < LONG_OUTPUT_LENGTH ? inputText : inputText.substring(0, LONG_OUTPUT_LENGTH) + '\n...'
  }

  const renderOutput = async (container) => {
    const result = currentData?.result
    if (result?.state === window.codioAssessmentsHelper.States.RESET) {
      return
    }
    const outputEl = $('<div class="hide"/>')
    if (isString(result?.feedback)) {
      outputEl.removeClass('hide')
      const feedbackContainer = getFeedbackContainer()
      const feedback = await renderFeedbackOutput(result.feedback, result.format)
      feedbackContainer.append(feedback)
      outputEl.append(feedbackContainer)
      if (result.code !== 0) {
        const debugFeedbackContainer = getFeedbackContainer()
        const debugFeedback = await renderFeedbackOutput(result.output)
        debugFeedbackContainer.append(debugFeedback)
        outputEl.append(debugFeedbackContainer)
      }
      return
    }
    if (isString(result?.output)) {
      outputEl.removeClass('hide')
      const outputContainer = getFeedbackContainer()
      outputContainer.html(getValidHtml(cutOutput(result.output)))
      outputEl.append(outputContainer)
    }
    container.append(outputEl)
  }

  const renderResult = () => {
    const assessmentState = getAssessmentState()
    const resultBlock = $('.codio-assessment-results-block')
    resultBlock.empty()
    if (!assessmentState.answered && !processing) {
      return
    }
    const result = currentData?.result
    const state = processing ? window.codioAssessmentsHelper.States.PROGRESS : result?.state
    const resultEl = $(`<div class="codio-assessment-result codio-assessment-block--topLeftArrow ${state}"></div>`)

    const assessmentStatus = window.codioAssessmentsHelper.getAssessmentResultStatus(
      assessment.source, result, processing
    )
    const iconStr = window.codioAssessmentsHelper.getIconByResultStatus(assessmentStatus)
    const iconEl = $(iconStr).addClass(`codio-assessment-result-status-icon ${assessmentStatus}`)
    const iconContainer = $('<div class="codio-assessment-result-icon-container"></div>')
    iconContainer.append(iconEl)
    resultEl.append(iconContainer)
    const resultInfoContainer = $('<div class="codio-assessment-result-result-info-container"></div>')

    if (result?.timestamp) {
      const timestamp = new Date(result.timestamp).toLocaleString()
      const timestampEl = $(`
<div class="codio-assessment-last-run">LAST RUN&nbsp;
<span class="codio-assessment-last-run-time">on ${timestamp}</span>
</div>
`)
      resultInfoContainer.append(timestampEl)
    }
    renderOutput(resultInfoContainer)
    resultEl.append(resultInfoContainer)

    const resultActionsContainer = $('<div class="codio-assessment-result-actions-container"></div>')
    const expandButton = $(`
<button class="codio-assessment-result-actions-expand" title="Expand output">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M10 21v-2H6.41l4.5-4.5l-1.41-1.41l-4.5 4.5V14H3v7zm4.5-10.09l4.5-4.5V10h2V3h-7v2h3.59l-4.5 4.5z"/></svg>
</button>
`)
    expandButton.attr('aria-label', `Expand output ${assessment.source.showName ? assessment.source.name : ''}`)
    expandButton.on('click', onExpandClick)
    resultActionsContainer.append(expandButton)
    resultEl.append(resultActionsContainer)
    resultBlock.append(resultEl)
  }

  const getAssessmentState = () => {
    const result = currentData ? currentData.result : null
    const answered = result?.state && result?.state !== window.codioAssessmentsHelper.States.RESET
    const usedAttempts = result?.usedAttempts || 0
    const canAnswerAgain = !assessment.source.maxAttemptsCount || usedAttempts < assessment.source.maxAttemptsCount
    const showModify = assessmentOptions.showUnblock && (!answered || canAnswerAgain)
    const isDisabled = processing ||
      assessmentOptions.isDisabled ||
      result?.state === window.codioAssessmentsHelper.States.PROGRESS ||
      answered && !canAnswerAgain
    const teacherInStudentsProject = assessmentOptions.showAsTeacher && !assessmentOptions.owner

    return {
      isDisabled,
      answered,
      usedAttempts,
      canAnswerAgain,
      showModify,
      teacherInStudentsProject
    }
  }

  const refreshResultAndFooter = () => {
    if (!assessment) {
      return
    }
    renderResult()
    updateFooterButtons()
  }

  const bindEvents = () => {
    $('.check-button').on('click', onCheck)
    $('.unblock-button').on('click', onUnblock)
    $('.reset-button').on('click', onReset)

    window.codioAssessmentsHelper.addBodyHeightListener()
  }

  const render = () => {
    const container = $('.codio-assessment')
    const nameEl = container.find('.codio-assessment-name')
    assessment.source.showName ? nameEl.text(assessment.source.name) : nameEl.remove()
    renderContent()
    updateCheckButtonText()
    renderGuidance()
    refreshResultAndFooter()
    bindEvents()
    container.removeClass('hide')
  }

  const processMessage = (jsonData) => {
    try {
      const {method, data} = JSON.parse(jsonData)
      console.log('assessment iframe processMessage', jsonData, method, data)
      switch (method) {
        case window.codioAssessmentsHelper.METHODS.GET_STYLES_RESPONSE:
          window.codioAssessmentsHelper.addStyle(data.css)
          break
        case window.codioAssessmentsHelper.METHODS.GET_STATE_RESPONSE:
          updateProcessing(false)
          applyState(data)
          break
        case window.codioAssessmentsHelper.METHODS.CALLBACK: {
          window.codioAssessmentsHelper.processCallback(data)
          break
        }
      }
    } catch {}
  }

  window.addEventListener('load', () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STATE)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STYLES)
  })
})()
