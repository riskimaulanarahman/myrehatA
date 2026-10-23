<?php
/**
 * Lightweight elFinder volume helpers for dashboard storage stats.
 *
 * @package File Manager Advanced
 */

defined('ABSPATH') || exit;

if (!interface_exists('elFinderSessionInterface') && defined('FMAFILEPATH')) {
	require_once FMAFILEPATH . 'application/library/php/elFinderSessionInterface.php';
}

if (!class_exists('AFM_Storage_Session') && interface_exists('elFinderSessionInterface')) {
	/**
	 * In-memory session — avoids PHP session_start() locking the file manager.
	 */
	class AFM_Storage_Session implements elFinderSessionInterface {
		private $started = false;
		private $data = array();
		private $keys = array(
			'default' => 'afmStorageStats',
			'netvolume' => 'afmStorageStatsNet',
		);

		public function start()
		{
			$this->started = true;
			return $this;
		}

		public function close()
		{
			$this->started = false;
			return $this;
		}

		public function get($key, $empty = '')
		{
			$closed = false;
			if (!$this->started) {
				$closed = true;
				$this->start();
			}
			$session = $this->getSessionRef($key);
			$data = is_null($session) ? $empty : $session;
			if ($closed) {
				$this->close();
			}
			return $data;
		}

		public function set($key, $data)
		{
			$closed = false;
			if (!$this->started) {
				$closed = true;
				$this->start();
			}
			$session =& $this->getSessionRef($key);
			$session = $data;
			if ($closed) {
				$this->close();
			}
			return $this;
		}

		public function remove($key)
		{
			$closed = false;
			if (!$this->started) {
				$closed = true;
				$this->start();
			}
			list($cat, $name) = array_pad(explode('.', $key, 2), 2, null);
			if (is_null($name)) {
				if (!isset($this->keys[$cat])) {
					$name = $cat;
					$cat = 'default';
				}
			}
			if (isset($this->keys[$cat])) {
				$cat = $this->keys[$cat];
			} else {
				$name = $cat . '.' . $name;
				$cat = $this->keys['default'];
			}
			if (is_null($name)) {
				unset($this->data[$cat]);
			} elseif (isset($this->data[$cat]) && is_array($this->data[$cat])) {
				unset($this->data[$cat][$name]);
			}
			if ($closed) {
				$this->close();
			}
			return $this;
		}

		private function &getSessionRef($key)
		{
			$session = null;
			if ($this->started) {
				list($cat, $name) = array_pad(explode('.', $key, 2), 2, null);
				if (is_null($name)) {
					if (!isset($this->keys[$cat])) {
						$name = $cat;
						$cat = 'default';
					}
				}
				if (isset($this->keys[$cat])) {
					$cat = $this->keys[$cat];
				} else {
					$name = $cat . '.' . $name;
					$cat = $this->keys['default'];
				}
				if (is_null($name)) {
					if (!isset($this->data[$cat])) {
						$this->data[$cat] = null;
					}
					$session =& $this->data[$cat];
				} else {
					if (!isset($this->data[$cat]) || !is_array($this->data[$cat])) {
						$this->data[$cat] = array();
					}
					if (!isset($this->data[$cat][$name])) {
						$this->data[$cat][$name] = null;
					}
					$session =& $this->data[$cat][$name];
				}
			}
			return $session;
		}
	}
}

if (!class_exists('AFM_Storage_Volume') && class_exists('elFinderVolumefma_local_filesystem')) {
	class AFM_Storage_Volume extends elFinderVolumefma_local_filesystem {
		protected function _checkArchivers()
		{
			$this->archivers = array(
				'create' => array(),
				'extract' => array(),
			);
		}
	}
}
