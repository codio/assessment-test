(function () {
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

  const collectSettings = () => {
    const instructions = $('#instructions').val()
    const timeout = parseInt($('#timeout').val(), 10);

    return {instructions, timeout};
  }

  const exportSettings = () => {
    const data = collectSettings();
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.EXPORT_SETTINGS_RESPONSE, data);
  }

  const applySettings = (settings = {}) => {
    $('#instructions').val(settings.instructions || '');
    $('#timeout').val(settings.timeout || '40');
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
      }
    } catch {}
  }

  const onSubtypeChanged = (language, subtype) => {
    $('.lang-subtype-settings-container').addClass('hide')
    $(`.lang-subtype-${language}-${subtype}-settings`).removeClass('hide')
  }

  const onLanguageChanged = (language) => {
    $('.language-settings-container').addClass('hide')
    $(`.${language}-container`).removeClass('hide')
    const subtype = $(`#${language}LangSubtype`).val()
    onSubtypeChanged(language, subtype)
  }

  const addParsedTestCase = (path, info) => {

  }

  const addTestCase = async (path) => {
    if ($(`.test-case-item[data-path="${path}"]`)) {
      // todo already added warning
      return
    }
    try {
      const {content} = await window.codioAssessmentsHelper.sendAndWait(
        window.codioAssessmentsHelper.METHODS.GET_FILE_CONTENT, {path}
      )
      const langType = $('#languageType').val()
      if (EXTENSIONS_BY_TYPE[langType]) {
        return
      }
      const subtype = $(`${langType}LangSubtype`).val()
      const ext = path.split('.').pop()
      if (langType === LANG_TYPES.JAVA && subtype === 'style' && ext === 'xml') {
        $('#javaStyleConfigPath').val(path)
        return
      }
      if (!EXTENSIONS_BY_TYPE[langType].includes(ext)) {
        // todo error 'Incorrect file type, should be: ' + typeToExtension[type].join(' ')
        return
      }
      if (LANG_TYPES.JAVA && subtype === SUBTYPES_BY_LANG.JAVA.STYLE) {
        try {
          const info = window.codioTestAssessment.javaGrammar.getJavaInfo(path, content)
          addParsedTestCase(path, info)
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
      if (!$(this).val().includes('.guides/secure')) {
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
  }

  const onLoad = async () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_SETTINGS)

    bindEvents()
  }

  window.addEventListener('load', onLoad);
})()
