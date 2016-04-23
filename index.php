<?php
/*
 * CS50: Quiz
 */

// Uncomment next block to enable debug output
/*
error_reporting(E_ALL | E_STRICT | E_NOTICE);
ini_set('display_errors', '1');
*/

// A some secret string for generate the result URLs
$secret = '_SECRET_IS_HERE_';

// login and sha256(password) pairs
// For get a sha256 hash use various online services like http://www.xorbin.com/tools/sha256-hash-calculator
$teacherLogins = array(array('email' => 'bob@example.com', 'password' => ''));



function smart_session_start() {
  $session_name = ini_get('session.name');
  // Ignore multiple call
  if (isset($_SESSION)) {
    return true;
  } else if ((isset($_COOKIE) && isset($_COOKIE[$session_name]) && !empty($_COOKIE[$session_name])) || (isset($_GET) && isset($_GET[$session_name]) && !empty($_GET[$session_name]))) {
    // If session cookies or GET varitable found - start session
    return session_start();
  } else {
    return false;
  }
}

function is_logined() {
  if (!isset($_SESSION) || empty($_SESSION) || !isset($_SESSION['email']) || empty($_SESSION['email'])) {
    return false;
  }
  return true;
}

smart_session_start();

$base_dir = dirname(__FILE__);
$base_url = implode('/', array_slice(explode('/', $_SERVER['PHP_SELF']), 0, -1));
$route = explode('/', $_GET['r']);

if ($route[0] == 'subimt') {
  $raw_post = file_get_contents('php://input');
  $json = json_decode($raw_post, true);
  header('Content-Type: application/json');

  // Quiz review
  if (is_logined() && isset($json['resultId'])) {

    if (!isset($json['quiz']) || !isset($json['answerResults']) || empty($json['answerResults'])) {
      header ('HTTP/1.0 400 Bad Request');
      echo json_encode(array('message' => 'Email is not present'));
      exit;
    }

    $quiz_result_file = $base_dir . '/results/q' . $json['quiz'] . '/' . $json['resultId'] . '.json';

    if (!file_exists($quiz_result_file)) {
      header ('HTTP/1.0 404 Not Found');
      echo json_encode(array('message' => 'No such results.'));
      exit;
    }

    // Load results
    $result_data = json_decode(file_get_contents($quiz_result_file), true);

    // Add review information
    $result_data['answerResults'] = (array) $json['answerResults'];
    $result_data['reviewTime'] = time();
    $result_data['reviewedBy'] = $_SESSION['email'];

    if (file_put_contents($quiz_result_file, json_encode($result_data)) === false) {
      header ('HTTP/1.0 500 Internal Server Error');
      echo json_encode(array('message' => 'Cannot save review'));
      exit;
    }

    echo json_encode(array('reviewTime' => $result_data['reviewTime'], 'reviewedBy' => $result_data['reviewedBy']));
  } else {
    // Save only specified fields
    $json = array('email' => $json['email'], 'quiz' => $json['quiz'], 'answers' => $json['answers']);

    if (!isset($json['email']) || empty($json['email'])) {
      header ('HTTP/1.0 400 Bad Request');
      echo json_encode(array('message' => 'Email is not present'));
      exit;
    }

    if (!isset($json['quiz']) || intval($json['quiz']) < 0) {
      header ('HTTP/1.0 400 Bad Request');
      echo json_encode(array('message' => 'Wrong quiz'));
      exit;
    }

    $json['quiz'] = intval($json['quiz']);
    $json['submitTime'] = time();

    $quiz_unique = hash('sha256', $secret . $json['quiz'] . $json['submitTime'] . $json['email']);
    $result_dir = $base_dir . '/results/q' . $json['quiz'] . '/';

    // Check result directory and create it if not exist
    $is_result_dir_ok = ((file_exists($result_dir) && is_writable($result_dir) && is_dir($result_dir)) || mkdir($result_dir, 0770, true));

    if (!$is_result_dir_ok || (file_put_contents($result_dir . $quiz_unique . '.json', json_encode($json)) === false)) {
      header ('HTTP/1.0 500 Internal Server Error');
      echo json_encode(array('message' => 'Cannot save results'));
      exit;
    }

    echo json_encode(array('url' => implode('/', array($base_url, 'quiz', $json['quiz'], $quiz_unique))));
  }
  exit;
} else if (is_logined() && $route[0] == 'submissions') {
  if ($route[1] == 'json') {
    header('Content-Type: application/json');
    $submissions = array();

    $results_dir = $base_dir . '/results/';

    if (is_readable($results_dir) && ($handle = opendir($results_dir))) {
      while (false !== ($quiz_result_dir = readdir($handle))) {
        if ($quiz_result_dir === '.' || $quiz_result_dir === '..') continue;

        if (is_dir($results_dir.$quiz_result_dir) && ($quiz_result_dir{0} === 'q')) {
          sscanf($quiz_result_dir, "q%d", $quiz_num);
          $submissions[$quiz_result_dir] = array();
          $quiz_dir = $results_dir.$quiz_result_dir . '/';

          // Read quiz results files
          if (is_readable($quiz_dir) && ($quiz_dir_handle = opendir($quiz_dir))) {
            while (false !== ($quiz_result_file = readdir($quiz_dir_handle))) {
              if ($quiz_result_file === '.' || $quiz_result_file === '..') continue;

              if (is_file($quiz_dir.$quiz_result_file)) {
                $path_parts = pathinfo($quiz_dir.$quiz_result_file);
                if ($path_parts['extension'] === 'json') {
                  try {
                      $result_data = json_decode(file_get_contents($quiz_dir.$quiz_result_file), true);
                      $submissions[$quiz_result_dir][] = array(
                        'resultId' => $path_parts['filename'],
                        'email' => $result_data['email'],
                        'submitTime' => $result_data['submitTime'],
                        'reviewTime' => $result_data['reviewTime'],
                        'answers' => count($result_data['answers']),
                        'reviewed' => (isset($result_data['answerResults']) && is_array($result_data['answerResults'])) ? count($result_data['answerResults']) : 0
                      );
                  } catch (Exception $e) {
                    // Show if have error parsing file
                    $submissions[$quiz_result_dir][] = array('resultId' => $path_parts['filename'], 'error' => true);
                  }
                }
              }
            }
          }
          closedir($quiz_dir_handle);
        }
      }
      closedir($handle);
    }

    echo json_encode($submissions);
  } else {
    echo str_replace(array('%baseURL%', "%config%"), array($base_url, 'var config = ' . json_encode(array('baseURL' => $base_url)) .';'), file_get_contents('submissions.html'));
  }
} else if ($route[0] == 'quiz') {
  $quiz_num = isset($route[1]) ? intval($route[1]) : 0;

  if ($route[2] == 'questions') {
    header('Content-Type: application/json');
    $quiestion_file = 'quiz/q' . $quiz_num . '/questions.json';

    if (file_exists($quiestion_file)) {
      echo file_get_contents($quiestion_file);
    } else {
      header ('HTTP/1.0 404 Not Found');
    }
  } else if (strlen($route[2]) == 64){
    $result_file = $base_dir . '/results/q' . $quiz_num . '/' . $route[2] . '.json';
    if (file_exists($result_file)) {
      $config = array(
        'baseURL' => $base_url,
        'resultId' => $route[2],
        'resultData' => json_decode(file_get_contents($result_file), true),
        'isTeacher' => is_logined()
      );
      echo str_replace(array('%baseURL%', '%config%'), array($base_url, 'var config = ' . json_encode($config) . ';'), file_get_contents('quiz.html'));
    } else {
      header ('HTTP/1.0 404 Not Found');
    }
  } else {
    header ('HTTP/1.0 404 Not Found');
  }
} else if ($route[0] == 'login') {
  $formEmail = '';
  $loginMsg = '';

  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    foreach ($teacherLogins as $loginInfo) {
      if (($_POST['email'] == $loginInfo['email']) && (hash('sha256', $_POST['password']) == $loginInfo['password'])) {
        header('Location: ' . $base_url . '/');
        session_start();
        $_SESSION['email'] = $_POST['email'];
        exit;
      }
    }

    // If nothing found - show error message and save email in form
    $formEmail = $_POST['email'];
    $loginMsg = '<div class="alert alert-danger"><h4>Email and password not match.</h4></div>';
  }

  echo str_replace(array('%baseURL%', '%formEmail%', '%loginMsg%'), array($base_url, $formEmail, $loginMsg), file_get_contents('login.html'));
} else if ($route[0] == 'logout') {
  if (is_logined()) {
    session_destroy();
  }

  header('Location: ' . $base_url . '/');
} else {
  echo str_replace(array('%baseURL%', "%config%"), array($base_url, 'var config = ' . json_encode(array('baseURL' => $base_url, 'isTeacher' => is_logined())) .';'), file_get_contents('quiz.html'));
}
