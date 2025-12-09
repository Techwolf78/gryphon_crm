// Global object to store form data (for demo purposes)
// In production, you should use Properties Service or a database
let formStorage = {};

function doGet(e) {
  try {
    Logger.log('doGet called with action: ' + e.parameter.action);
    Logger.log('All parameters received: ' + JSON.stringify(e.parameter));
    
    const action = e.parameter.action;
    
    if (action === 'getResponses') {
      Logger.log('Processing getResponses action');
      return getResponses(e);
    }
    
    // Default action: create form
    Logger.log('Processing createForm action (default)');
    return createForm(e);
    
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createJSONPResponse({
      success: false,
      error: 'Server error: ' + error.toString()
    }, e.parameter.callback || 'callback');
  }
}

function createForm(e) {
  // Get data from query parameter
  const dataString = e.parameter.data;
  if (!dataString) {
    throw new Error('No data received');
  }
  
  // Parse the data
  const data = JSON.parse(dataString);
  
  // Create a new Google Form
  const form = FormApp.create(data.title);
  if (data.description) {
    form.setDescription(data.description);
  }
  
  // Add questions
  const questionsWithIds = data.questions.map((questionData, index) => {
    let item;
    
    switch(questionData.type) {
      case 'text':
        item = form.addTextItem();
        break;
        
      case 'paragraph':
        item = form.addParagraphTextItem();
        break;
        
      case 'multiple_choice':
        item = form.addMultipleChoiceItem();
        if (questionData.options && questionData.options.length > 0) {
          item.setChoiceValues(questionData.options);
        }
        break;
        
      case 'checkbox':
        item = form.addCheckboxItem();
        if (questionData.options && questionData.options.length > 0) {
          item.setChoiceValues(questionData.options);
        }
        break;
        
      case 'dropdown':
        item = form.addListItem();
        if (questionData.options && questionData.options.length > 0) {
          item.setChoiceValues(questionData.options);
        }
        break;
        
      case 'linear_scale':
        item = form.addScaleItem();
        item.setBounds(1, 5);
        break;
        
      case 'date':
        item = form.addDateItem();
        break;
        
      case 'time':
        item = form.addTimeItem();
        break;
        
      default:
        item = form.addTextItem();
    }
    
    item.setTitle(questionData.title);
    
    // Set required if specified
    if (questionData.required) {
      item.setRequired(true);
    }
    
    return {
      question: questionData.title,
      type: questionData.type,
      itemId: item.getId(),
      options: questionData.options || []
    };
  });

  // Apply form settings if provided
  if (data.settings) {
    if (data.settings.collectEmail) {
      form.setCollectEmail(true);
    }
    if (data.settings.limitToOneResponse) {
      form.setLimitOneResponsePerUser(true);
    }
    if (data.settings.allowEditAfterSubmit) {
      form.setAllowResponseEdits(true);
    }
    if (data.settings.showProgressBar) {
      form.setProgressBar(true);
    }
    if (data.settings.shuffleQuestions !== undefined) {
      form.setShuffleQuestions(data.settings.shuffleQuestions);
    }
  }
  
  // Get form URLs
  const formUrl = form.getPublishedUrl();
  const editUrl = form.getEditUrl();
  const formId = form.getId();
  
  // Store form info for response retrieval
  const formInfo = {
    formId: formId,
    title: data.title,
    created: new Date().toISOString(),
    questions: questionsWithIds,
    responseCount: 0
  };
  
  // Store using Properties Service (persistent)
  const properties = PropertiesService.getScriptProperties();
  const forms = JSON.parse(properties.getProperty('forms') || '{}');
  forms[formId] = formInfo;
  properties.setProperty('forms', JSON.stringify(forms));
  
  // Return response
  return createJSONPResponse({
    success: true,
    formUrl: formUrl,
    editUrl: editUrl,
    formId: formId,
    message: 'Google Form created successfully!',
    info: 'Responses will be available after people submit the form.'
  }, e.parameter.callback);
}

function getResponses(e) {
  try {
    const formId = e.parameter.formId;
    
    // Log for debugging
    Logger.log('getResponses called with formId: ' + formId);
    Logger.log('All parameters: ' + JSON.stringify(e.parameter));
    
    if (!formId) {
      return createJSONPResponse({
        success: false,
        error: 'Form ID is required. Received: ' + JSON.stringify(e.parameter)
      }, e.parameter.callback);
    }
    
    // Get form by ID - this will throw an error if form doesn't exist
    let form;
    try {
      form = FormApp.openById(formId);
    } catch (error) {
      Logger.log('Error opening form: ' + error.toString());
      return createJSONPResponse({
        success: false,
        error: 'Form with ID "' + formId + '" not found or not accessible. Error: ' + error.toString()
      }, e.parameter.callback);
    }
    
    // Get all responses
    const formResponses = form.getResponses();
    Logger.log('Found ' + formResponses.length + ' responses');
    
    const responses = [];
    
    // Get form items for reference
    const formItems = form.getItems();
    const itemMap = {};
    
    // Create a map of item IDs to question titles
    formItems.forEach(item => {
      itemMap[item.getId()] = {
        title: item.getTitle(),
        type: item.getType()
      };
    });
    
    Logger.log('Form has ' + formItems.length + ' questions');
    
    // Process each response
    formResponses.forEach((formResponse, index) => {
      const itemResponses = formResponse.getItemResponses();
      const responseData = {
        id: formResponse.getId(),
        timestamp: formResponse.getTimestamp().toISOString(),
        responder: formResponse.getRespondentEmail() || 'Anonymous',
        answers: {}
      };
      
      // Map responses to questions using item map
      itemResponses.forEach(itemResponse => {
        const itemId = itemResponse.getItem().getId();
        const itemInfo = itemMap[itemId];
        
        if (itemInfo) {
          responseData.answers[itemInfo.title] = {
            answer: itemResponse.getResponse(),
            questionType: itemInfo.type.toString()
          };
        }
      });
      
      responses.push(responseData);
    });
    
    Logger.log('Processed ' + responses.length + ' responses');
    
    // Get summary statistics
    const summary = getResponseSummaryFromForm(formItems, responses);
    
    const result = {
      success: true,
      formTitle: form.getTitle(),
      formId: formId,
      totalResponses: formResponses.length,
      lastResponse: formResponses.length > 0 ? 
        formResponses[formResponses.length - 1].getTimestamp().toISOString() : 
        null,
      responses: responses,
      summary: summary,
      formInfo: {
        id: formId,
        url: form.getPublishedUrl(),
        editUrl: form.getEditUrl(),
        questionCount: formItems.length
      }
    };
    
    Logger.log('Returning success response');
    return createJSONPResponse(result, e.parameter.callback);
    
  } catch (error) {
    Logger.log('Unexpected error in getResponses: ' + error.toString());
    return createJSONPResponse({
      success: false,
      error: 'Unexpected error: ' + error.toString()
    }, e.parameter.callback);
  }
}

function getResponseSummaryFromForm(formItems, responses) {
  if (responses.length === 0) {
    return {
      message: 'No responses yet',
      completionRate: 0
    };
  }
  
  const summary = {
    totalResponses: responses.length,
    questionStats: {}
  };
  
  // Analyze each question
  formItems.forEach(item => {
    const questionText = item.getTitle();
    const answers = responses
      .map(r => r.answers[questionText])
      .filter(a => a !== undefined);
    
    if (answers.length === 0) return;
    
    const stats = {
      totalAnswered: answers.length,
      responseRate: (answers.length / responses.length) * 100
    };
    
    // Different analysis based on question type
    const itemType = item.getType();
    
    if (itemType === FormApp.ItemType.MULTIPLE_CHOICE ||
        itemType === FormApp.ItemType.DROPDOWN) {
      stats.choiceDistribution = {};
      answers.forEach(answerObj => {
        const answer = answerObj.answer;
        if (answer) {
          stats.choiceDistribution[answer] = (stats.choiceDistribution[answer] || 0) + 1;
        }
      });
      
      // Calculate percentages
      Object.keys(stats.choiceDistribution).forEach(choice => {
        stats.choiceDistribution[choice] = {
          count: stats.choiceDistribution[choice],
          percentage: (stats.choiceDistribution[choice] / answers.length) * 100
        };
      });
    } else if (itemType === FormApp.ItemType.CHECKBOX) {
      stats.choiceDistribution = {};
      answers.forEach(answerObj => {
        const answer = answerObj.answer;
        if (Array.isArray(answer)) {
          answer.forEach(choice => {
            stats.choiceDistribution[choice] = (stats.choiceDistribution[choice] || 0) + 1;
          });
        } else if (answer) {
          stats.choiceDistribution[answer] = (stats.choiceDistribution[answer] || 0) + 1;
        }
      });
      
      // Calculate percentages
      Object.keys(stats.choiceDistribution).forEach(choice => {
        stats.choiceDistribution[choice] = {
          count: stats.choiceDistribution[choice],
          percentage: (stats.choiceDistribution[choice] / answers.length) * 100
        };
      });
    } else if (itemType === FormApp.ItemType.SCALE) {
      const numericAnswers = answers.map(a => parseFloat(a.answer)).filter(n => !isNaN(n));
      if (numericAnswers.length > 0) {
        const sum = numericAnswers.reduce((a, b) => a + b, 0);
        stats.average = sum / numericAnswers.length;
        stats.min = Math.min(...numericAnswers);
        stats.max = Math.max(...numericAnswers);
      }
    }
    
    summary.questionStats[questionText] = stats;
  });
  
  return summary;
}


function createJSONPResponse(data, callbackName = 'callback') {
  return ContentService
    .createTextOutput(`${callbackName}(${JSON.stringify(data)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// Helper function to list all forms
function listForms() {
  const properties = PropertiesService.getScriptProperties();
  const forms = JSON.parse(properties.getProperty('forms') || '{}');
  
  const formList = Object.keys(forms).map(formId => {
    try {
      const form = FormApp.openById(formId);
      return {
        id: formId,
        title: form.getTitle(),
        url: form.getPublishedUrl(),
        responseCount: forms[formId].responseCount,
        created: forms[formId].created,
        questionCount: forms[formId].questions.length
      };
    } catch (e) {
      return {
        id: formId,
        title: forms[formId].title,
        error: 'Form not accessible',
        responseCount: forms[formId].responseCount,
        created: forms[formId].created
      };
    }
  });
  
  return JSON.stringify(formList, null, 2);
}

// Test function
function testGetResponses() {
  const properties = PropertiesService.getScriptProperties();
  const forms = JSON.parse(properties.getProperty('forms') || '{}');
  const formIds = Object.keys(forms);
  
  if (formIds.length === 0) {
    console.log('No forms found');
    return;
  }
  
  const testFormId = formIds[0];
  console.log('Testing response retrieval for form:', testFormId);
  
  const result = getResponses({
    parameter: {
      formId: testFormId,
      callback: 'test'
    }
  });
  
  console.log(result.getContent());
}