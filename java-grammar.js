window.codioTestAssessment = window.codioTestAssessment || {}
window.codioTestAssessment.javaGrammar = window.codioTestAssessment.javaGrammar || {}

window.codioTestAssessment.javaGrammar.SLASH = '/'
window.codioTestAssessment.javaGrammar.BACK_SLASH = '\\'
window.codioTestAssessment.javaGrammar.STAR = '*'
window.codioTestAssessment.javaGrammar.DOUBLE_QUOTE = '"'
window.codioTestAssessment.javaGrammar.NEW_LINE = '\n'
window.codioTestAssessment.javaGrammar.LEFT_BRACE = '{'
window.codioTestAssessment.javaGrammar.RIGHT_BRACE = '}'

window.codioTestAssessment.javaGrammar.packageReg = new RegExp(
  'package\\s+([a-zA-Z_]{1}[a-zA-Z0-9_]*(\\.[a-zA-Z_]{1}[a-zA-Z0-9_]*)*)\\s*;',
  'm'
)
window.codioTestAssessment.javaGrammar.classNameReg = new RegExp(
  '\\s*(public|private)?(static)?\\s*class\\s+(\\w+)' +
  '\\s*((extends\\s+\\w+)|(implements\\s+\\w+( ,\\w+)*))?\\s*\\{',
  'm'
)
window.codioTestAssessment.javaGrammar.anonClassNameReg = new RegExp('\\s*new\\s+(\\w+)\\s*\\(\\w*\\)\\s*\\{', 'm')

function removeCommentsAndStrings(content) {
  const {DOUBLE_QUOTE, BACK_SLASH, SLASH, STAR, NEW_LINE} = window.codioTestAssessment.javaGrammar
  let updatedContent = ''
  let isCommentStarted = false
  let isStringStarted = false
  let isMultiline = false
  for (let i = 0, len = content.length; i < len; i++) {
    let current = content[i]
    if (current === DOUBLE_QUOTE && !isCommentStarted) {
      if (content[i - 1] !== BACK_SLASH) {
        isStringStarted = !isStringStarted
        if (!isStringStarted) {
          current = ' '
        }
      }
    }
    if (!isStringStarted && current === SLASH) {
      if (content[i + 1] === SLASH) {
        isCommentStarted = true
        isMultiline = false
      }
      if (content[i + 1] === STAR) {
        isCommentStarted = true
        isMultiline = true
      }
    }
    if (isCommentStarted) {
      if (isMultiline) {
        if (current === STAR && content[i + 1] === SLASH) {
          isCommentStarted = false
          current = '  '
          i++
        }
      } else {
        if (current === NEW_LINE) {
          isCommentStarted = false
        }
      }
    }
    if (isStringStarted || isCommentStarted) {
      if (current !== NEW_LINE) {
        current = ' '
      }
    }
    updatedContent += current
  }
  return updatedContent
}

const findClassEnd = (content) => {
  const {RIGHT_BRACE, LEFT_BRACE} = window.codioTestAssessment.javaGrammar

  let level = 0
  for (let i = 0, len = content.length; i < len; i++) {
    let current = content[i]
    if (current === RIGHT_BRACE) {
      if (level === 0) {
        return i
      } else {
        level--
      }
    } else if (current === LEFT_BRACE) {
      level++
    }
  }
  return content.length
}

const classesInformation = (data) => {
  const {classNameReg, anonClassNameReg} = window.codioTestAssessment.javaGrammar
  let allClasses = []

  let classSearch = data
  let classNameMatch = classSearch.match(classNameReg)
  let offset = 0
  let start = 0
  let end = 0
  while (classNameMatch) {
    start = classNameMatch.index + classNameMatch[0].length
    classSearch = classSearch.substring(start, classSearch.length)
    end = findClassEnd(classSearch)
    allClasses.push({
      name: classNameMatch[3],
      start: start + offset,
      end: start + end + offset
    })
    offset += start
    classNameMatch = classSearch.match(classNameReg)
  }

  let anonClassSearch = data
  let anonClassNameMatch = anonClassSearch.match(anonClassNameReg)
  offset = 0
  while (anonClassNameMatch) {
    start = anonClassNameMatch.index + anonClassNameMatch[0].length
    anonClassSearch = anonClassSearch.substring(start, anonClassSearch.length)
    end = findClassEnd(anonClassSearch)
    allClasses.push({
      start: start + offset,
      end: start + end + offset
    })
    offset += start
    anonClassNameMatch = anonClassSearch.match(anonClassNameReg)
  }

  allClasses = allClasses.sort((a, b) => {
    return a.start - b.start
  })

  const classesInfo = {}
  const processed = []

  allClasses.forEach(function (item, pos) {
    if (pos === 0) {
      classesInfo[item.name] = item
      classesInfo[item.name].anon = 1
      processed.push(classesInfo[item.name])
    } else {
      let lastNested = null
      processed.forEach(function (parentItem) {
        if (parentItem.start < item.start && parentItem.end > item.end) {
          lastNested = parentItem
        }
      })
      if (lastNested) {
        let name
        if (!item.name) {
          name = lastNested.name + '$' + lastNested.anon
          lastNested.anon++
        } else {
          name = lastNested.name + '$' + item.name
        }

        classesInfo[name] = item
        classesInfo[name].anon = 1
        classesInfo[name].name = name
        processed.push(classesInfo[name])
      }
    }
  })

  return processed
}

const getClassInfo = (path, content) => {
  const {packageReg} = window.codioTestAssessment.javaGrammar
  const pathsPart = path.split('/')
  const fileName = pathsPart[pathsPart.length - 1]

  const information = {
    packageName: '',
    className: '',
    fileName: fileName,
    path: path
  }

  let advancedClassInformation
  const withoutComments = removeCommentsAndStrings(content)

  const packageMatch = withoutComments.match(packageReg)
  if (packageMatch) {
    information.packageName = packageMatch[1]
  }
  advancedClassInformation = classesInformation(withoutComments)

  const lastNested = advancedClassInformation[0]

  if (lastNested) {
    information.className = lastNested.name
  }

  return information
}

window.codioTestAssessment.javaGrammar.getJavaInfo = (path, content) => {
  const classInformation = getClassInfo(path, content)
  if (!classInformation.className) {
    const message = 'Java class not found in ' + path
    throw new Error(message)
  }
  const hasTestAnnotations =
    content.includes('@Test') ||
    content.includes('@ParameterizedTest') ||
    content.includes('@org.junit.jupiter.api.Test') ||
    content.includes('@org.junit.jupiter.params.ParameterizedTest')
  if (!hasTestAnnotations && !content.includes('extends')) {
    const message = 'JUnit test not found in ' + path
    throw new Error(message)
  }
  const result = {}
  const jUnit5Case = content.includes('.jupiter.')
  if (jUnit5Case) {
    const wrongNaming = !(
      classInformation.className.endsWith('Test') ||
      classInformation.className.endsWith('Tests')
    )
    if (wrongNaming) {
      result.info = `${classInformation.className} class name do not match against class names ending in Test or Tests. This test may not function correctly.`
    }
  }
  const className = !classInformation.packageName
    ? classInformation.className
    : classInformation.packageName + '.' + classInformation.className
  return {
    ...result,
    filePath: path,
    className
  }
}
