(function () {
  const ICON_DELETE = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM8 9h8v10H8zm7.5-5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'

  const LANG_TYPES = {
    JAVA: 'java',
    CUSTOM: 'custom',
    RUBY: 'ruby',
    PYTHON: 'python',
    JAVASCRIPT: 'javascript'
  }

  const SUBTYPES_BY_LANG = {
    [LANG_TYPES.JAVA]: {
      STYLE: 'style',
      JUNIT: 'junit'
    },
    [LANG_TYPES.RUBY]: {
      STYLE: 'style',
      RSPEC: 'rspec'
    },
    [LANG_TYPES.PYTHON]: {
      STYLE: 'style',
      UNITTEST: 'unittest'
    },
    [LANG_TYPES.JAVASCRIPT]: {
      JSHINT: 'jshint',
      JSLINT: 'jslint'
    }
  }

  const EXTENSIONS_BY_TYPE = {
    [LANG_TYPES.JAVA]: ['java'],
    [LANG_TYPES.RUBY]: ['rb'],
    [LANG_TYPES.PYTHON]: ['py'],
    [LANG_TYPES.JAVASCRIPT]: ['js']
  }

  const getCodeEnvConfig = () => {
    const langType = $('#languageType').val()

    if (langType === LANG_TYPES.CUSTOM) {
      return null
    }

    const subtype = $(`#${langType}LangSubtype`).val()
    const isJava = langType === LANG_TYPES.JAVA

    const files = []
    $(`.test-case-item`).each(function() {
      const test = $(this)
      const filePath = test.find('.test-case-info-path').find('.test-case-info-text').text()
      if (isJava && subtype === SUBTYPES_BY_LANG.JAVA.JUNIT) {
        const className = test.find('.test-case-info-class').find('.test-case-info-text').text()
        files.push({filePath, className})
      } else {
        files.push(filePath)
      }
    })

    let envConfig = {
      type: langType,
      subtype,
      files
    }
    if (isJava) {
      if (subtype === SUBTYPES_BY_LANG.JAVA.JUNIT) {
        const javaConfig = {
          wd: $('#javaJunitWorkingDirectory').val(),
          sources: $('#javaJunitSourcePath').val(),
          libs: $('#javaJunitLibraryPath').val(),
          testsources: $('#junitTestsSourcePath').val(),
          jUnitVersion: $('#javaJunitVersion').val()
        }
        envConfig = {...envConfig, ...javaConfig}
      } else if (subtype === SUBTYPES_BY_LANG.JAVA.STYLE) {
        envConfig = {
          ...envConfig,
          configFile: $('#javaStyleConfigPath').val(),
          checkStyleVersion: $('#javaCheckStyleVersion').val()
        }
      }
    } else if (langType === LANG_TYPES.PYTHON && subtype === SUBTYPES_BY_LANG.PYTHON.UNITTEST) {
      envConfig = {
        ...envConfig,
        executable: $('#pythonUnittestExecutable').val(),
        pythonwd: $('#pythonUnittestWorkingDirectory').val()
      }
    }
    return envConfig
  }

  const collectSettings = () => {
    const instructions = $('#instructions').val()
    const timeout = parseInt($('#timeout').val(), 10);
    const langType = $('#languageType').val()
    const subtype = $(`#${langType}LangSubtype`).val()

    const data = {
      instructions,
      timeout
    }

    const pythonUnittestStudentFolder = $('#pythonUnittestStudentFolder').val()
    if (langType === LANG_TYPES.PYTHON && subtype === SUBTYPES_BY_LANG.PYTHON.UNITTEST && pythonUnittestStudentFolder) {
      data.pythonPath = pythonUnittestStudentFolder
    }
    if (langType === LANG_TYPES.CUSTOM) {
      data.command = $('#customCommand').val()
    } else {
      data.codeEnvConfig = JSON.stringify(getCodeEnvConfig() || {})
    }
    return data;
  }

  const exportSettings = () => {
    const data = collectSettings();
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.EXPORT_SETTINGS_RESPONSE, data);
  }

  const applySettings = (settings = {}) => {
    $('#instructions').val(settings.instructions || '');
    $('#timeout').val(settings.timeout || '40');
    const config = settings.codeEnvConfig ? JSON.parse(settings.codeEnvConfig) : null
    onLanguageChanged(config?.type || LANG_TYPES.CUSTOM)
  }

  const processMessage = (jsonData) => {
    console.log('settings iframe processMessage', jsonData)
    try {
      const {method, data} = JSON.parse(jsonData);
      switch (method) {
        case window.codioAssessmentsHelper.METHODS.EXPORT_SETTINGS:
          exportSettings();
          break;
        case window.codioAssessmentsHelper.METHODS.GET_SETTINGS_RESPONSE:
          applySettings(data.settings);
          break;
        case window.codioAssessmentsHelper.METHODS.CALLBACK: {
          window.codioAssessmentsHelper.processCallback(data)
          break
        }
      }
    } catch {}
  }

  const onSubtypeChanged = (language, subtype) => {
    $('.lang-subtype-settings-container').addClass('hide')
    $(`.lang-subtype-${language}-${subtype}-settings`).removeClass('hide')
  }

  const onLanguageChanged = (language) => {
    $('.language-settings-container').addClass('hide')
    const testsContainer = $('.test-case-container')
    testsContainer.addClass('hide')
    testsContainer.find('.test-case-list').empty()
    if (language !== LANG_TYPES.CUSTOM) {
      testsContainer.removeClass('hide')
    }
    $(`.${language}-container`).removeClass('hide')
    const subtype = $(`#${language}LangSubtype`).val()
    onSubtypeChanged(language, subtype)
  }

  const addParsedTestCase = (info) => {
    const path = info?.filePath || info
    const className = info?.className

    const list = $('.test-case-list')
    const itemContainer = $('<div class="test-case-item" />')
    itemContainer.data('path', path)
    const infoContainer = $('<div class="test-case-item-info" />')
    const pathInfoRow = $('<div class="test-case-info-row test-case-info-path" />')
    pathInfoRow.append('<div class="test-case-info-label">Path:</div>')
    pathInfoRow.append(`<div class="test-case-info-text">${path}</div>`)
    infoContainer.append(pathInfoRow)
    if (className) {
      const classInfoRow = $('<div class="test-case-info-row test-case-info-class" />')
      classInfoRow.append('<div class="test-case-info-label">Class name:</div>')
      classInfoRow.append(`<div class="test-case-info-text">${className}</div>`)
      infoContainer.append(classInfoRow)
    }

    const actionsContainer = $('<div class="test-case-item-actions" />')
    const deleteBtn = $(`<button type="button" title="Delete test case" aria-label="Delete test case" class="test-case-delete-button">
${ICON_DELETE}
</button>`)
    actionsContainer.append(deleteBtn)
    itemContainer.append(infoContainer)
    itemContainer.append(actionsContainer)
    list.append(itemContainer)
    updateTestsHelpBlockVisibility()
  }

  const updateTestsHelpBlockVisibility = () => {
    const list = $('.test-case-list')
    const hasItems = !!list.find('.test-case-item')[0]
    const helpBlock = $('.test-case-noItems-block')
    hasItems ? helpBlock.addClass('hide') : helpBlock.removeClass('hide')
  }

  const removeTestCase = (item) => {
    // todo confirm removal
    item.remove()
    updateTestsHelpBlockVisibility()
  }

  const addTestCase = async (path) => {
    console.log('add test case', path)
    if ($(`.test-case-item[data-path="${path}"]`)[0]) {
      // todo already added warning
      return
    }
    try {
      // todo need to implement get/set content for settings
      const {content} = await window.codioAssessmentsHelper.sendAndWait(
        window.codioAssessmentsHelper.METHODS.GET_FILE_CONTENT, {path}
      )
      const langType = $('#languageType').val()
      if (!EXTENSIONS_BY_TYPE[langType]) {
        return
      }
      const subtype = $(`#${langType}LangSubtype`).val()
      const ext = path.split('.').pop()
      if (langType === LANG_TYPES.JAVA && subtype === 'style' && ext === 'xml') {
        $('#javaStyleConfigPath').val(path)
        return
      }
      if (!EXTENSIONS_BY_TYPE[langType].includes(ext)) {
        console.error(`Ext ${ext} not supported`)
        // todo error 'Incorrect file type, should be: ' + typeToExtension[type].join(' ')
        return
      }
      if (LANG_TYPES.JAVA && subtype === SUBTYPES_BY_LANG.JAVA.STYLE) {
        try {
          const info = window.codioTestAssessment.javaGrammar.getJavaInfo(path, content)
          addParsedTestCase(info)
        } catch (e) {
          // todo show errors
        }
      } else {
        addParsedTestCase(path)
      }
    } catch (e) {
      // todo show error
    }
  }

  const bindEvents = () => {
    $('#languageType').on('change', function () {
      const languageType = $(this).val();
      onLanguageChanged(languageType);
    })
    $('.lang-subtype-select').on('change', function () {
      const langSubtype = $(this).val();
      onSubtypeChanged($('#languageType').val(), langSubtype);
    })
    $('#customCommand').on('input', function () {
      const helpBlock = $('.secure-folder-help-block')
      helpBlock.addClass('hide')
      if ($(this).val().includes('.guides/secure')) {
        helpBlock.removeClass('hide')
      }
    })
    $('#newCasePath').on('input', function () {
      const addCaseBtn = $('.add-case-btn')
      addCaseBtn.prop('disabled', !$(this).val())
    })
    $('.add-case-btn').on('click', function () {
      addTestCase($('#newCasePath').val())
    })
    $('.test-case-list').on('click', '.test-case-delete-button', function () {
      removeTestCase($(this).closest('.test-case-item'));
    })
  }

  const onLoad = async () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_SETTINGS)

    bindEvents()
  }

  window.addEventListener('load', onLoad);
})()
