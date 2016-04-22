<?php

error_reporting(E_ALL | E_STRICT | E_NOTICE);
ini_set('display_errors', '1');

$secret = 'niQECdIKSkdOBO0xFL/w2Ez8AqkHn9BUJT3WyGrgcLH8c8Oj2ofv4ZmRQJv4PVCCa+PiLk2BPPf';
$base_dir = dirname(__FILE__);
$base_url = implode('/', array_slice(explode('/', $_SERVER['PHP_SELF']), 0, -1));
$route = explode('/', $_GET['r']);

if ($route[0] == 'subimt') {

  $raw_post = file_get_contents('php://input');
  $json = json_decode($raw_post, true);

  header('Content-Type: application/json');

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
  $json['submit_time'] = time();

  $quiz_unique = hash('sha256', $secret . $json['quiz'] . $json['submit_time'] . $json['email']);
  $result_dir = $base_dir . '/results/q' . $json['quiz'] . '/';

  // Check result directory and create it if not exist
  if (
      ((file_exists($result_dir) && is_writable($result_dir) && is_dir($result_dir)) || !mkdir($result_dir, 0770, true)) &&
      (file_put_contents($result_dir . $quiz_unique . '.json', json_encode($json)) === false)
      ) {
    header ('HTTP/1.0 500 Internal Server Error');
    echo json_encode(array('message' => 'Cannot save results'));
    exit;
  }

  echo json_encode(array('url' => implode('/', array($base_url, 'quiz', $json['quiz'], $quiz_unique))));
  exit;

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
        'resultID' => $route[2],
        'resultData' => file_get_contents($result_file)
      );
      echo str_replace(array('%baseURL%', '%config%'), array($base_url, 'var config = ' . json_encode($config) . ';'), file_get_contents('quiz.html'));
    } else {
      header ('HTTP/1.0 404 Not Found');
    }
  } else {
    header ('HTTP/1.0 404 Not Found');
  }
} else {
  echo str_replace(array('%baseURL%', "%config%"), array($base_url, 'var config = {baseURL: "' . $base_url . '"};'), file_get_contents('quiz.html'));
}
