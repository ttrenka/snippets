<?php
	//By    : Isusx Programming Corner
	//URL   : http://isusx.com

	function get_num_name($num){
		switch($num){
			case 1:
				return 'one';
			case 2:
				return 'two';
			case 3:
				return 'three';
			case 4:
				return 'four';
			case 5:
				return 'five';
			case 6:
				return 'six';
			case 7:
				return 'seven';
			case 8:
				return 'eight';
			case 9:
				return 'nine';
		}
	}

	function num_to_words($number, $real_name, $decimal_digit, $decimal_name){
		$res = '';
		$real = 0;
		$decimal = 0;

		if($number == 0)
			return 'Zero'.(($real_name == '')?'':' '.$real_name);
		if($number >= 0){
			$real = floor($number);
			$decimal = round($number - $real, $decimal_digit);
		}else{
			$real = ceil($number) * (-1);
			$number = abs($number);
			$decimal = $number - $real;
		}
		$decimal = (int)str_replace('.','',$decimal);

		$unit_name[0] = '';
		$unit_name[1] = 'thousand';
		$unit_name[2] = 'million';
		$unit_name[3] = 'billion';
		$unit_name[4] = 'trillion';

		$packet = array();	

		$number = strrev($real);
		$packet = str_split($number,3);

		for($i=0;$i<count($packet);$i++){
			$tmp = strrev($packet[$i]);
			$unit = $unit_name[$i];
			if((int)$tmp == 0)
				continue;
			$tmp_res = '';
			if(strlen($tmp) >= 2){
				$tmp_proc = substr($tmp,-2);
				switch($tmp_proc){
					case '10':
						$tmp_res = 'ten';
						break;
					case '11':
						$tmp_res = 'eleven';
						break;
					case '12':
						$tmp_res = 'twelve';
						break;
					case '13':
						$tmp_res = 'thirteen';
						break;
					case '15':
						$tmp_res = 'fifteen';
						break;
					case '20':
						$tmp_res = 'twenty';
						break;
					case '30':
						$tmp_res = 'thirty';
						break;
					case '40':
						$tmp_res = 'forty';
						break;
					case '50':
						$tmp_res = 'fifty';
						break;
					case '70':
						$tmp_res = 'seventy';
						break;
					case '80':
						$tmp_res = 'eighty';
						break;
					default:
						$tmp_begin = substr($tmp_proc,0,1);
						$tmp_end = substr($tmp_proc,1,1);

						if($tmp_begin == '1')
							$tmp_res = get_num_name($tmp_end).'teen';
						elseif($tmp_begin == '0')
							$tmp_res = get_num_name($tmp_end);
						elseif($tmp_end == '0')
							$tmp_res = get_num_name($tmp_begin).'ty';
						else{
							if($tmp_begin == '2')
								$tmp_res = 'twenty';
							elseif($tmp_begin == '3')
								$tmp_res = 'thirty';
							elseif($tmp_begin == '4')
								$tmp_res = 'forty';
							elseif($tmp_begin == '5')
								$tmp_res = 'fifty';
							elseif($tmp_begin == '6')
								$tmp_res = 'sixty';
							elseif($tmp_begin == '7')
								$tmp_res = 'seventy';
							elseif($tmp_begin == '8')
								$tmp_res = 'eighty';
							elseif($tmp_begin == '9')
								$tmp_res = 'ninety';

							$tmp_res = $tmp_res.' '.get_num_name($tmp_end);
						}
						break;
				}
				if(strlen($tmp) == 3){
					$tmp_begin = substr($tmp,0,1);

					$space = '';
					if(substr($tmp_res,0,1) != ' ' && $tmp_res != '')
						$space = ' ';

					if($tmp_begin != 0){
						if($tmp_begin != '0'){
							if($tmp_res != '')
								$tmp_res = 'and'.$space.$tmp_res;
						}
						$tmp_res = get_num_name($tmp_begin).' hundred'.$space.$tmp_res;
					}
				}
			}else
				$tmp_res = get_num_name($tmp);
			$space = '';
			if(substr($res,0,1) != ' ' && $res != '')
				$space = ' ';
			$res = $tmp_res.' '.$unit.$space.$res;
		}

		$space = '';
		if(substr($res,-1) != ' ' && $res != '')
			$space = ' ';

		$res .= $space.$real_name.(($real > 1 && $real_name != '')?'s':'');

		if($decimal > 0)
			$res .= ' '.num_to_words($decimal, '', 0, '').' '.$decimal_name.(($decimal > 1 && $decimal_name != '')?'s':'');
		return ucfirst($res);
	}

	/*
	//Examples:

	echo num_to_words('11314', '', 0, '').'<br/>';
	//Result: Eleven thousand three hundred and fourteen
	echo num_to_words('12500', '', 0, '').'<br/>';
	//Result: Twelve thousand five hundred
	echo num_to_words('1234567890', '', 0, '').'<br/>';
	//Result: One billion two hundred and thirty four million five hundred and sixty seven thousand eight hundred and ninety
	echo num_to_words('325.25', 'euro', 2, 'cent').'<br/>';
	//Result: Three hundred and twenty five euros Twenty five cents
	echo num_to_words('1234567890.25', 'dollar', 2, 'cent').'<br/>';
	//Result: One billion two hundred and thirty four million five hundred and sixty seven thousand eight hundred and ninety dollars Twenty five cents
	*/
?>
