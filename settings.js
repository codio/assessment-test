(function () {
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
    $('#timeout').val(settings.timeout || '');
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

  const bindEvents = () => {
    $('#languageType').on('change', function () {
      const languageType = $(this).val();
      onLanguageChanged(languageType);
    })
    $('.lang-subtype-select').on('change', function () {
      const langSubtype = $(this).val();
      onSubtypeChanged($('#languageType').val(), langSubtype);
    })

    // $("html").on("dragover", function(event) {
    //   event.preventDefault();
    //   event.stopPropagation();
    //   console.log('dragover', event);
    // });
    //
    // $("html").on("dragleave", function(event) {
    //   event.preventDefault();
    //   event.stopPropagation();
    //   console.log('dragover', event);
    // });

    $("html").on("drop", function(event) {
      event.preventDefault();
      event.stopPropagation();
      console.log('drop', event);
    });
  }

  const onLoad = async () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_SETTINGS)

    bindEvents()
  }

  window.addEventListener('load', onLoad);
})()
