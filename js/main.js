'use strict';

(function($) {
  var quizNumber = 0;
  var storageKey = 'cs50_quiz';
  var storageAnswersKey = 'answers';

  var storage = StorageApi(storageKey);
  var questions = [];

  var answerTypes = {
    text: 0,
    longText: 2,
    selectOne: 3,
    selectMulti: 4
  };

  var alertButtons = {
    alert: 0,
    submit: 1,
    reset: 2
  };

  var getStorageAnswerKey = function() {
    return storageAnswersKey + '_' + quizNumber;
  };

  var applyEmailId = function(email) {
      $('#id_form').hide().find('input').val(email);
      $('#email_id').toggleClass('hide').find('span').first().text(email);
  };

  var mapLines = function(lines) {
    if (!_.isArray(lines)) {
      lines = [lines];
    }
    return _.map(lines, function(text, idx) {
      return $('<p>' + text + '</p>');
    });
  };

  var addDescription = function($node, description, revenue, idx) {
    var lines = mapLines(description);


    if (config.resultID) {
      if (config.resultData.acceptTime) {
        var key = 'q_' + idx;
        // TODO: Change to resultData.answerResults
        //if (!( key in config.resultData.answers))
      } else {
        //lines[0].prepend('<span class="label label-success">Correct</span> ');
        //lines[0].prepend('<span class="label label-danger">Incorect</span> ');
        lines[0].prepend('<span class="label label-default">On review</span> ');
      }
    }
    lines[0].prepend('<span class="label label-primary">'+ revenue +' point' + (revenue > 1 ? 's' : '') + '</span> ');

    $node.append(lines);
  };

  var addSubtitle = function($node, subtitle) {
    $node.append(mapLines(subtitle));
  };

  var isCheckedItem = function(values, value) {
    var checked = false;


    if (values) {
      if (_.isArray(values)) {
        checked = !_.isUndefined(_.find(values, function(val) { return val == value; }));
      } else {
        checked = (value == values);
      }
    }

    return checked;
  };

  var addQuestionInput = function($node, idx, type, question, value) {
    question = _.extend({}, {type: answerTypes.text, inputType: 'text'}, question);
    value = value || question.value || '';

    switch(type) {
      case answerTypes.selectOne:
        _.each(question.options, function(option, option_idx) {
          var itemValue = option;
          var itemLabel = option;

          if (_.isObject(option)) {
            itemValue = option.value;
            itemLabel = option.title;
          }
          var checked = isCheckedItem(value, itemValue);


          $node.append('<div class="radio-inline"><label><input type="radio" name="q_'+ idx + '" value="' + itemValue + '"' + (checked ? 'checked="checked"' : '') + '>' + itemLabel + '</label></div>')
        });
        break;
      case answerTypes.selectMulti:
        _.each(question.options, function(option, option_idx) {
          var itemValue = option;
          var itemLabel = option;
          if (_.isObject(option)) {
            itemValue = option.value;
            itemLabel = option.title;
          }

          var checked = isCheckedItem(value, itemValue);

          $node.append('<div class="checkbox-inline"><label><input type="checkbox" name="q_'+ idx + '[]" value="' + itemValue + '" ' + (checked ? 'checked="checked"' : '') + '>' + itemLabel + '</label></div>')
        });
        break;
      case answerTypes.longText:
        var $ta = $('<textarea name="q_' + idx + '" rows="5" class="form-control" placeholder="' + (question.placeholder ? question.placeholder : '') + '"></textarea>');

        if (value) {
          $ta.val(value);
        }

        $node.append($ta);
        break;
      default:
        $node.append('<input type="' + question.inputType + '" name="q_' + idx + '" class="form-control" value="' + value + '" placeholder="' + (question.placeholder ? question.placeholder : '') + '">');
    }
  };

  var showQuestions = function() {
    var $form = $('#quiz_form');
    var answers = (config.resultData && config.resultData.answers) || storage.get(getStorageAnswerKey()) || {};
    var $fg;

    $form.empty();
    _.each(questions, function(question, idx) {
      $fg = $('<div class="form-group"></div>');

      if (question.title) {
        $fg.append($('<h3>' + question.title + '</h3>'));
      }
      if (question.subtitle) {
        addSubtitle($fg, question.subtitle);
      }

      addDescription($fg, question.description, question.revenue, idx);
      addQuestionInput($fg, idx, question.type, question, answers['q_' + idx]);

      $fg.find('img').each(function(idx, img) {
        img.src = config.baseURL + img.getAttribute('src');
      });
      $form.append($fg)
    });

    if (config.resultID) {
      blockForm(true);
    } else {
      $fg = $('<div class="form-group"></div>');
      $fg.append('<button type="submit" class="btn btn-success">Submit</button>');
      $fg.append(' ');
      $fg.append('<button type="reset" class="btn btn-danger">Reset</button>');
      $form.append($fg)
    }
  };

  var resetQuestions = function() {
    storage.set(getStorageAnswerKey(), {});
    showQuestions();
  };

  var form2Hash = function(form) {
    var hash = {};
    _.each($(form).serializeArray(), function(item) {
      var itemName = item.name;
      if (itemName.indexOf('[]') !== -1) {
        itemName = itemName.split('[]')[0];
      }
      if (hash[itemName] || item.name.indexOf('[]') !== -1) {
        if (!hash[itemName]) {
          hash[itemName] = [];
        }
        hash[itemName].push(item.value);
      } else {
        hash[itemName] = item.value;
      }
    });

    return hash;
  };

  var blockForm = function(force) {
    $('#quiz_form').find('input, textarea').prop({readOnly: true, disabled: !!force});
  };

  var unblockForm = function() {
    $('#quiz_form').find('input, textarea').prop({readOnly: false, disabled: false});
  };

  var createAlert = function(title, msg, type, calback) {
    type = type || alertButtons.alert;
    var $alert_dlg = $('<div class="alert fade hide" role="alert">\
              <button type="button" class="close" data-dismiss="alert" aria-label="Close">\
                <span aria-hidden="true">×</span>\
              </button>\
              <h4>' + title + '</h4>\
              <p>' + msg + '</p>\
            </div>');

    var $buttonContainer = $('<p />');
    switch(type) {
      case alertButtons.submit:
          $buttonContainer.append('<button type="button" data-result="1" data-dismiss="alert" class="btn btn-success">Submit</button>\
            <button type="button" class="btn btn-default" data-result="0" data-dismiss="alert">Cancel</button>');
        break;
      case alertButtons.reset:
          $buttonContainer.append('<button type="button" data-result="1" data-dismiss="alert" class="btn btn-danger">Reset</button>\
            <button type="button" class="btn btn-default" data-result="0" data-dismiss="alert">Cancel</button>');
        break;
      default:
        $buttonContainer.append('<button type="button" data-result="1" class="btn btn-default" data-dismiss="alert">OK</button>');
    }
    $buttonContainer.find('button').click(function(evt) {
      evt.preventDefault();
      calback && calback(!!$(this).data('result'));
    });


    $alert_dlg.append($buttonContainer);

    return $alert_dlg;
  };

  var showAlert = function($node) {
    $('#alert_container').append($node);
    $node.removeClass('hide');
    $node[0].scrollIntoView();
    setTimeout(function() {
      $node.addClass('in');
    }, 50);
  }

  var showSuccessMessage = function(title, msg, type, calback) {
    var $alertDlg = createAlert(title, msg, type, calback);
    $alertDlg.addClass('alert-success');
    showAlert($alertDlg);
  };

  var showErrorMessage = function(title, msg, type, calback) {
    var $alertDlg = createAlert(title, msg, type, calback);
    $alertDlg.addClass('alert-danger');
    showAlert($alertDlg);
  };

  var loadQuizQuestions = function(calback) {
    $.getJSON(config.baseURL + '/quiz/' + quizNumber + '/questions').fail(function(xhr, status, errorThrown) {
      var msg = status + ': ' + errorThrown;
      if (xhr.responseText) {
        msg = JSON.parse(xhr.responseText).message
      }
      unblockForm();
      showErrorMessage(msg);
    }).done(function(data) {
      questions = data;
      calback && calback();
    });
  };

  var submitQuestions = function() {
    var answers = form2Hash($('#quiz_form'));

    $.post(config.baseURL + '/subimt', JSON.stringify({email: storage.get('email'), quiz: quizNumber, answers: answers})).fail(function(xhr, status, errorThrown) {
      var msg = status + ': ' + errorThrown;
      if (xhr.responseText) {
        msg = JSON.parse(xhr.responseText).message
      }
      unblockForm();
      showErrorMessage('Error', msg);
    }).done(function(res) {
      $('#quiz_form').hide();
      showSuccessMessage('Submit quiz', 'You quiz successfully submitted. You will be redirected to quiz result page.', alertButtons.alert);
      setTimeout(function() {
        window.location = res.url;
      }, 2000);
    });
  };

  $(function() {
    if (config.resultID) {
      $('#quiz-selector').hide();
      //config.resultData.acceptTime = Math.round((new Date()).getTime() / 1000);

      $('.quiz-number').text(config.resultData.quiz);
      var acceptDate = new Date(config.resultData.submitTime * 1000);
      $('#submit_time').removeClass('hide').find('span').text(acceptDate.toLocaleString());

      if (config.resultData.acceptTime) {
        $('.jumbotron h1 .label-success').removeClass('hidden');
      } else {
        $('.jumbotron h1 .label-default').removeClass('hidden');
      }

      applyEmailId(config.resultData.email);
      loadQuizQuestions(function() {
        if (config.resultData.acceptTime) {
          var totalScore = _.reduce(questions, function(revenue, question, idx) {
            // TODO: Change to resultData.answerResults
            return config.resultData.answers['q_' + idx] ? revenue + question.revenue : revenue;
          }, 0);
          $('.jumbotron .alert.alert-success').removeClass('hidden');
          $('#accept_time').find('span').text(acceptDate.toLocaleString());
          $('#quiz_score').text(totalScore);
        }
        showQuestions();
      });
    } else {
      var $id_form = $('#id_form');
      if (storage.get('email')) {
        applyEmailId(storage.get('email'));
        $id_form.find('button[type="reset"]').removeClass('hide');

        loadQuizQuestions(showQuestions);
      }

      // Edit email
      $('#email_id').on('dblclick', function(evt) {
        evt.preventDefault();

        $(this).toggleClass('hide');
        $id_form.show();
      });
      // Set email
      $id_form.on('submit', function(evt) {
        evt.preventDefault();

        if (!storage.get('email')) {
          loadQuizQuestions(showQuestions);
        }
        storage.set('email', this.elements.email.value);
        applyEmailId(this.elements.email.value);
      }).on('reset', function(evt) {
        evt.preventDefault();
        applyEmailId(storage.get('email'));
      });

      // Quiz form submit/reset
      $('#quiz_form').on('submit', function(evt) {
        evt.preventDefault();
        blockForm();
        $(this).find('.form-group').last().hide();

        showSuccessMessage('Submit quiz?', 'You provide all answers and ready to go?', alertButtons.submit, function(result) {
          if (result) {
            submitQuestions();
          } else {
            unblockForm();
          }
          $('#quiz_form').find('.form-group').last().show();
        });
      }).on('reset', function(evt) {
        evt.preventDefault();
        blockForm();
        $(this).find('.form-group').last().hide();

        showErrorMessage('Reset form?', 'This action clear all your progress. Continue?', alertButtons.reset, function(result) {
          if (result) {
            resetQuestions();
          } else {
            unblockForm();
          }
          $('#quiz_form').find('.form-group').last().show();
        });
      }).on('change', function(evt) {
        storage.set(getStorageAnswerKey(), form2Hash(this));
      });

      // Quiz selector
      $('#quiz-selector .dropdown-menu a').click(function(evt) {
        evt.preventDefault();
        var $this = $(this);

        var newQuizNumber = parseInt($this.data('number'));
        if (newQuizNumber !== quizNumber) {
          quizNumber = newQuizNumber;
          loadQuizQuestions(showQuestions);
        }
        $this.closest('.dropdown').toggleClass('open');
        $('.quiz-number').text(quizNumber);
      });
    }

  });
})(jQuery);
