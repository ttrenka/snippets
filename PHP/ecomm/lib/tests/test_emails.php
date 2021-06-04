<?php
include_once("../../supportemails.inc");
include_once("../config.php");
include_once("../phpMailer/class.phpmailer.php");

function send_mail($config, $subject, $to, $to_name = "", $html, $text = "", $bcc = array()){
	$bSuccess = false;
	try {
		$mail = new PHPMailer();
		$mail->IsSMTP();
		$mail->host = $config["smtpHost"];
		$mail->From = $config["mailFrom"];
		$mail->FromName = $config["mailFromName"];
		$mail->AddReplyTo($config["mailReplyTo"]);

		if(is_array($to)){
			foreach($to as $addr){
				$mail->AddAddress($addr);
			}
		} else {
			$mail->AddAddress($to, $to_name);
		}

		$mail->Subject = $subject;

		foreach($bcc as $addr){
			$mail->AddBCC($addr);
		}

		$mail->MsgHTML($html);
		if(strlen($text)){
			$mail->AltBody = $text;
		}

		$bSuccess = $mail->Send();
	} catch (Exception $ex){
		//	we don't really want to swallow this but it's outputting warning messages,
		//	and that's a problem with JSON.
	}
	return $bSuccess;
}

//	support confirmation test.
//	echo get_support_confirm_html("John", "Foo", "bar");
//	echo "<pre>" . get_support_confirm_text("John", "foo", "bar") . "</pre>";

$html = get_support_confirm_html("Tom Trenka", "ttrenka@yahoo.com", "password");
$b = send_mail($CONFIG, "Support confirm email test", "ttrenka@yahoo.com", "Tom Trenka", $html);
echo "<div>Mail was sent: " . ($b ? "true" : "false") . "</div>";
?>
