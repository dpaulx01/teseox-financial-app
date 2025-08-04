<?php
file_put_contents('/tmp/test.log', "Test file executed\n", FILE_APPEND);
echo json_encode(['success' => true, 'message' => 'Test successful']);
?>