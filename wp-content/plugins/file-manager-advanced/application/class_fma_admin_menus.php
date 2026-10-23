<?php
/*
@package: File Manager Advanced
@Class: fma_admin_menus
*/
if (class_exists('class_fma_admin_menus')) {
    return;
}
class class_fma_admin_menus
{
    var $langs;
    /**
     * @var bool
     */
    private static $hooks_registered = false;

    /**
     * AFM - Languages
     */
    public function __construct()
    {
        include('class_fma_lang.php');
        $this->langs = new class_fma_adv_lang();

        if (!self::$hooks_registered) {
            add_action('fma__settings_tab_notifications_content', array($this, 'notification_callback'));
            // Free: Show AI Integration (Code Pilot) tab content as a PRO teaser
            add_action('fma__settings_tab_ai_content', array($this, 'ai_integration_callback'));
            add_action('admin_init', array($this, 'restrict_fm_only_admin_access'));
            add_action('admin_menu', array($this, 'trim_fm_submenus_for_restricted_users'), 99999);
            add_action('admin_menu', array($this, 'hide_menus_moved_to_react_ui'), 99999);
            add_filter('submenu_file', array($this, 'hide_pro_module_menus'), 999, 2);
            self::$hooks_registered = true;
        }
    }

    /**
     * Notification Callback
     * @since 6.7.3
     */
    public function notification_callback()
    {
        $email_heading = esc_html__('Email notification Settings', 'file-manager-advanced');
        $slack_heading = esc_html__('Slack Notification', 'file-manager-advanced');
        $pro_badge = esc_html__('PRO', 'file-manager-advanced');

        if (!class_exists('AFMP\\Modules\\EmailNotification\\EmailNotification')) {
            echo '<div afmp-href="https://advancedfilemanager.com/pricing/?utm_source=plugin&utm_medium=email_notification&utm_campaign=plugin" class="fma__wrap">';
            echo '<h2 class="fma__heading">' . $email_heading . ' <span class="fma__heading-pro-tag">' . $pro_badge . '</span></h2>';

            echo '<table class="form-table" role="presentation"><tbody><tr><th scope="row"><label for="enable">Enable</label></th><td>            <input type="checkbox" id="enable" name="afmp__email_notification_settings[enable]" value="yes">
            <label for="enable">Enable email notification</label>
            </td></tr><tr><th scope="row"><label for="email">Email Address</label></th><td>            <input type="text" id="email" name="afmp__email_notification_settings[email]" value="" class="regular-text">
            <p class="description">Email address to send notification.</p>
            </td></tr><tr><th scope="row"><label for="events">Events</label></th><td>                <label>
                    <input type="checkbox" name="afmp__email_notification_settings[events][]" value="rm">
                    Delete File/Folder                </label><br>
                                <label>
                    <input type="checkbox" name="afmp__email_notification_settings[events][]" value="mkfile">
                    Create File                </label><br>
                                <label>
                    <input type="checkbox" name="afmp__email_notification_settings[events][]" value="mkdir">
                    Create Folder                </label><br>
                </td></tr><tr><th scope="row"><label for="subject">Email Subject</label></th><td>            <input type="text" id="subject" name="afmp__email_notification_settings[subject]" class="regular-text">
            <p class="description">Subject of the email notification.</p>
            </td></tr><tr><th scope="row"><label for="message">Email Message</label></th><td>            <textarea id="message" name="afmp__email_notification_settings[message]" rows="5" class="large-text">The file action {event} was performed on {file_name} ({ext}) at {date_time} from IP {ip_address} on {site_name} by {username}.
Thank you for using Advanced File Manager.</textarea>
            <p class="description">Message body of the email notification. You can use placeholders like {file_name}, {action} etc.</p>
            <p class="description">Available placeholders:</p><ul class="afmp-email-placeholders"><li><code>{username}</code> - This will fetch the user’s name who did the action</li><li><code>{ip_address}</code> - This will fetch the user’s IP Address</li><li><code>{event}</code> - This will fetch which file the user has created or deleted</li><li><code>{file_name}</code> - This will fetch the file name on which that action was done</li><li><code>{ext}</code> - This will fetch the file extension on which that action was done</li><li><code>{date_time}</code> - This will fetch the date the user acted on the file</li><li><code>{site_name}</code> - This will fetch the site name on which the action was performed</li></ul></td></tr></tbody></table>';
            echo '</div>';
        }

        if (!class_exists('AFMP\\Modules\\SlackNotification\\SlackNotification')) {
            echo '<div afmp-href="https://advancedfilemanager.com/pricing/?utm_source=plugin&utm_medium=slack_notification&utm_campaign=plugin" class="fma__wrap">';
            echo '<h2 class="fma__heading">' . $slack_heading . ' <span class="fma__heading-pro-tag">' . $pro_badge . '</span></h2>';

            echo '<table class="form-table" role="presentation"><tbody><tr><th scope="row"><label for="afmp_slack_enable">Enable Slack Notification</label></th><td><input type="checkbox" id="afmp_slack_enable" name="afmp__slack_notification_settings[enable]" value="yes"><label for="afmp_slack_enable">Enable Slack Notification</label></td></tr><tr><th scope="row"><label for="afmp_slack_webhook_url">Slack Webhook URL</label></th><td><input type="text" id="afmp_slack_webhook_url" name="afmp__slack_notification_settings[webhook_url]" class="large-text"><p class="description">Enter your Slack Webhook URL to receive notifications.</p><a href="#">Click here to get your webhook URL</a></td></tr><tr><th scope="row"><label for="afmp_slack_event_notification">Event Notification</label></th><td><label><input type="checkbox" name="afmp__slack_notification_settings[events][]" value="rm">Delete File/Folder</label><br><label><input type="checkbox" name="afmp__slack_notification_settings[events][]" value="mkfile">Create File</label><br><label><input type="checkbox" name="afmp__slack_notification_settings[events][]" value="mkdir">Create Folder</label><br></td></tr><tr><th scope="row"><label for="slack_notification_message">Slack Notification Message</label></th><td><textarea id="slack_notification_message" name="afmp__slack_notification_settings[message]" rows="5" class="large-text">A quick update from the Advanced File Manager plugin on your site {site_name}.
A file was {event} by {username} on {date_time}. The file name is {file_name} with the extension {ext}, and the action was performed from the following IP Address: {ip_address}.</textarea><p class="description">Customize the message to be sent to Slack. You can use placeholders like {file_name}, {action}, etc.</p><p class="description">Available placeholders:</p><ul class="afmp-slack-placeholders"><li><code>{username}</code> - This will fetch the user’s name who did the action</li><li><code>{ip_address}</code> - This will fetch the user’s IP Address</li><li><code>{event}</code> - This will fetch which file the user has created or deleted</li><li><code>{file_name}</code> - This will fetch the file name on which that action was done</li><li><code>{ext}</code> - This will fetch the file extension on which that action was done</li><li><code>{date_time}</code> - This will fetch the date the user acted on the file</li><li><code>{site_name}</code> - This will fetch the site name on which the action was performed</li></ul></td></tr></tbody></table>';
            echo '</div>';
        }

    }

    /**
     * AI Integration (Code Pilot) Callback
     * Mirrors notification_callback pattern for the free version
     * @since 5.4.1
     */
    public function ai_integration_callback()
    {
        if (!class_exists('AFMP\\Modules\\AFMP_AI_Integration')) {
            // Defaults to avoid undefined variable notices in free view
            $enabled = '0';
            $api_key = '';
            ?>
            <style type="text/css">
                .ai__heading {
                    color: #000;
                    font-size: 18px;
                    font-weight: 600;
                    line-height: normal;
                }

                .ai__heading-pro-tag {
                    display: inline-block;
                    padding: 2px 8px;
                    background: linear-gradient(270deg, #011D33 0%, #3F6972 100%);
                    border-radius: 4px;
                    color: #fff;
                    font-size: 12px;
                    margin-left: 25px;
                }

                .ai__wrap {
                    opacity: 0.5;
                    position: relative;
                }

                .ai__wrap::before {
                    content: "";
                    display: block;
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 1;
                    background: transparent;
                }
            </style>
            <h2 class="ai__heading"><?php echo esc_html__('AI Integration (Code Pilot)', 'file-manager-advanced'); ?> <span class="ai__heading-pro-tag"><?php echo esc_html__('PRO', 'file-manager-advanced'); ?></span></h2>
            <div class="ai__wrap fma__wrap"
                afmp-href="https://advancedfilemanager.com/pricing/?utm_source=plugin&utm_medium=ai_integration&utm_campaign=plugin">
                <div class="afmp-ai-settings">
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                        <?php wp_nonce_field('afmp_save_ai_settings', 'afmp_ai_nonce'); ?>
                        <input type="hidden" name="action" value="afmp_save_ai_settings" />
                        <table class="form-table">
                            <tr>
                                <th scope="row">
                                    <label for="afmp_ai_enabled"><?php esc_html_e('Enable AI Integration', 'file-manager-advanced'); ?></label>
                                </th>
                                <td>
                                    <input type="checkbox" name="afmp_ai_enabled" id="afmp_ai_enabled" value="1" <?php checked($enabled, '1'); ?> />
                                    <p class="description">
                                        <?php esc_html_e('Enable Code Pilot AI assistant in the code editor.', 'file-manager-advanced'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row">
                                    <label for="afmp_gpt_api_key"><?php esc_html_e('GPT API Key', 'file-manager-advanced'); ?></label>
                                </th>
                                <td>
                                    <input type="password" name="afmp_gpt_api_key" id="afmp_gpt_api_key"
                                        value="<?php echo esc_attr($api_key); ?>" class="regular-text" autocomplete="off" />
                                    <p class="description">
                                        <?php esc_html_e('Enter your OpenAI GPT API key. This key is stored only for your user account.', 'file-manager-advanced'); ?>
                                    </p>
                                </td>
                            </tr>
                        </table>
                        <?php submit_button(__('Save Changes', 'file-manager-advanced')); ?>
                    </form>

                    <div
                        style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-left: 4px solid #0073aa; border-radius: 4px;">
                        <h3 style="margin-top: 0; color: #0073aa;"><?php echo esc_html__('How to Use Code Pilot', 'file-manager-advanced'); ?></h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <h4 style="color: #333; margin-bottom: 10px;"><?php echo esc_html__('Chat Assistant', 'file-manager-advanced'); ?></h4>
                                <ol style="margin: 0; padding-left: 20px;">
                                    <li><?php echo esc_html__('Open any file in the File Manager editor', 'file-manager-advanced'); ?></li>
                                    <li><?php echo esc_html__('Click the Code Pilot button (bottom right)', 'file-manager-advanced'); ?></li>
                                    <li><?php echo esc_html__('Type your questions or requests in the chat', 'file-manager-advanced'); ?></li>
                                    <li><?php echo esc_html__('AI will respond with code suggestions', 'file-manager-advanced'); ?></li>
                                    <li><?php echo esc_html__('Click Apply to insert code into your file', 'file-manager-advanced'); ?></li>
                                </ol>
                            </div>
                            <div>
                                <h4 style="color: #333; margin-bottom: 10px;"><?php echo esc_html__('Inline Suggestions', 'file-manager-advanced'); ?></h4>
                                <ol style="margin: 0; padding-left: 20px;">
                                    <li><?php echo esc_html__('Start typing code in the editor', 'file-manager-advanced'); ?></li>
                                    <li><?php echo esc_html__('AI will show ghost text suggestions', 'file-manager-advanced'); ?></li>
                                    <li><?php echo esc_html__('Press Tab to accept suggestions', 'file-manager-advanced'); ?></li>
                                    <li><?php echo esc_html__('Press Esc to dismiss suggestions', 'file-manager-advanced'); ?></li>
                                    <li><?php echo esc_html__('AI learns from your codebase for better suggestions', 'file-manager-advanced'); ?></li>
                                </ol>
                            </div>
                        </div>

                        <div style="margin-top: 20px; padding: 15px; background: #fff; border-radius: 4px; border: 1px solid #ddd;">
                            <h4 style="margin-top: 0; color: #333;"><?php echo esc_html__('Example Requests', 'file-manager-advanced'); ?></h4>
                            <ul style="margin: 0; padding-left: 20px;">
                                <li><?php echo esc_html__('Add proper comments to this code', 'file-manager-advanced'); ?></li>
                                <li><?php echo esc_html__('Fix the syntax error in this function', 'file-manager-advanced'); ?></li>
                                <li><?php echo esc_html__('Optimize this database query', 'file-manager-advanced'); ?></li>
                                <li><?php echo esc_html__('Add error handling to this code', 'file-manager-advanced'); ?></li>
                                <li><?php echo esc_html__('Convert this to use WordPress hooks', 'file-manager-advanced'); ?></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <?php
        }
    }

    /**
     * Loading Menus
     */
    public function load_menus()
    {

        $fmaPer = $this->fmaPer();

        /** Authorizing only super admin to manage settings */
        $subPer = 'manage_options';
        if (is_multisite() && !is_network_admin()) {
            $subPer = 'manage_network';
            $fmaPer = $this->networkPer();
        }

        add_menu_page(
            __('File Manager', 'file-manager-advanced'),
            __('File Manager', 'file-manager-advanced'),
            $fmaPer,
            'file_manager_advanced_ui',
            array($this, 'file_manager_advanced_ui'),
            plugins_url('assets/icon/fma-new.svg', __FILE__),
            4
        );
        /*
         * WordPress uses the first submenu slug for the parent menu href. Without this duplicate,
         * the top-level File Manager click can open another submenu (e.g. DB Access) instead of the React UI.
         */
        add_submenu_page(
            'file_manager_advanced_ui',
            __('Advanced File Manager', 'file-manager-advanced'),
            __('File Manager', 'file-manager-advanced'),
            $fmaPer,
            'file_manager_advanced_ui',
            array($this, 'file_manager_advanced_ui')
        );
        // Settings, File Logs, and Integration submenus removed - now handled in new React UI
        // Settings: Now in Settings tab
        // File Logs: Now in Logs tab
        // Integrations: Now in Integrations tab

        // Blocks submenu is now handled by class_fma_blocks
        // Old submenu removed - blocks post type is used instead
        // if(!class_exists('file_manager_advanced_shortcode')) {
        //     add_submenu_page( 'file_manager_advanced_ui', 'Blocks', 'Blocks', $subPer, 'file_manager_advanced_shortcodes', array(&$this, 'file_manager_advanced_shortcodes'));
        // }

        if (!class_exists('AFMP\\Modules\\Adminer')) {
            add_submenu_page(
                'file_manager_advanced_ui',
                __('DB Access', 'file-manager-advanced'),
                __('DB Access', 'file-manager-advanced'),
                'manage_options',
                'afmp-adminer',
                array($this, 'adminer_menu')
            );
        }
    }

    /**
     * Remove legacy File Manager submenu items replaced by React UI tabs.
     * Runs after Pro (released) registers Integrations / File Logs on partial Free upgrades.
     */
    public function hide_menus_moved_to_react_ui()
    {
        if (!function_exists('fma_has_react_admin_navigation') || !fma_has_react_admin_navigation()) {
            return;
        }

        global $submenu;
        if (!isset($submenu['file_manager_advanced_ui']) || !is_array($submenu['file_manager_advanced_ui'])) {
            return;
        }

        $react_tab_slugs = array(
            'file_manager_advanced_controls', // Settings tab
            'afmp-integrations',            // Integrations tab (Pro)
            'afm-integrations-pro',         // Integrations fallback (Free legacy)
            'afmp-file-logs',               // Logs tab
        );

        $pro_module_slugs = array(
            'afmp-dropbox',
            'afmp-googledrive',
            'afmp-onedrive',
            'afmp-aws',
            'afmp-amazons3',
            'afmp-github',
            'afmp-googlecloud',
            'afmp-pcloud',
            'afmp-cloudflarer2',
            'afmp-wasabi',
        );

        if (defined('AFMP_IS_APPSUMO') && AFMP_IS_APPSUMO) {
            $pro_module_slugs[] = 'afmp-plan-features';
        }

        $hidden_slugs = array_merge($react_tab_slugs, $pro_module_slugs);
        $smtp_slug = (defined('FMA_PLUGIN_SLUG') ? FMA_PLUGIN_SLUG : 'file-manager-advanced') . '-recommend-post-smtp';
        $hidden_slugs[] = $smtp_slug;

        foreach ($submenu['file_manager_advanced_ui'] as $key => $menu_item) {
            if (!isset($menu_item[2])) {
                continue;
            }
            $slug = $menu_item[2];
            if (in_array($slug, $hidden_slugs, true) || false !== strpos($slug, 'recommend-post-smtp')) {
                unset($submenu['file_manager_advanced_ui'][$key]);
            }
        }
    }

    // Settings, File Logs, and Integration submenu hide functions removed - menus are no longer registered

    /**
     * Hide Pro module menus from admin menu display (fallback for late submenu mutations).
     */
    public function hide_pro_module_menus($submenu_file, $parent_file)
    {
        if ('file_manager_advanced_ui' !== $parent_file) {
            return $submenu_file;
        }

        if (function_exists('fma_has_react_admin_navigation') && fma_has_react_admin_navigation()) {
            $this->hide_menus_moved_to_react_ui();
        }

        return $submenu_file;
    }

    /**
     * AI Code Pilot callback - redirect to settings
     */
    public function ai_code_pilot_callback()
    {
        $target_url = admin_url('admin.php?page=file_manager_advanced_controls&tab=ai');
        ?>
        <script>
            window.location.href = '<?php echo $target_url; ?>';
        </script>
        <p><?php echo esc_html__('Redirecting to AI Integration Settings...', 'file-manager-advanced'); ?> <a href="<?php echo esc_url($target_url); ?>"><?php echo esc_html__('Click here', 'file-manager-advanced'); ?></a></p>
        <?php
        exit;
    }

    /**
     * Dropbox menu
     * @since 6.7.2
     */
    public function dropbox_menu()
    {

        echo '
        <h2 class="dropbox__heading">Dropbox Settings <span class="dropbox__heading-pro-tag">PRO</span></h2>

        <div class="dropbox__wrap">
            <table class="form-table">
                <tr>
                    <th>
                        <lable for="fma__enable">Enable</lable>
                    </th>
                    <td>
                        <input type="checkbox" id="fma__enable">
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__alias">Alias</label>
                    </th>
                    <td>
                        <input type="text" id="afm__alias" class="regular-text">
                        <p class="desc">
                            <strong>Enter a title which will be displayed on File Manager</strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__app_key">App Key</label>
                    </th>
                    <td>
                        <input type="text" id="afm__app_key" class="regular-text">
                        <p class="desc">
                            <strong>Enter your Dropbox App key, you will get your app key from <a href="#">Dropbox App Console</a></strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__app_secret">App Secret</label>
                    </th>
                    <td>
                        <input type="text" id="afm__app_secret" class="regular-text">
                        <p class="desc">
                            <strong>Enter your Dropbox App secret, you will get your app secret from <a href="#">Dropbox App Console</a></strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__redirect_url">Redirect URL</label>
                    </th>
                    <td>
                        <input type="text" id="afm__redirect_uri" class="regular-text">
                        
                        <p class="desc">
                            <strong>
                                Copy this URL and paste it in your Dropbox App Console under Redirect URIs
                            </strong>
                        </p>
                    </td>
                </tr>
            </table>';

        submit_button();

        echo '</div>';
    }

    /**
     * OneDrive menu
     * @since 6.7.3
     */
    public function onedrive_menu()
    {

        echo '<style>
            .onedrive__heading {
                color: #000;
                font-size: 18px;
                font-style: normal;
                font-weight: 600;
                line-height: normal;
            }
            
            .onedrive__heading-pro-tag {
                display: inline-block;
                padding: 2px 8px;
                background: linear-gradient(270deg, #011D33 0%, #3F6972 100%);
                border-radius: 4px;
                color: #fff;
                font-size: 12px;
                margin-left: 25px;
            }
            
            .onedrive__wrap {
                opacity: 0.5;
                position:relative;
            }
            
            .onedrive__wrap::before {
                content: "";
                display: block;
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0;
                left: 0;
                z-index: 1;
                background: transparent;
            }
        </style>';

        echo '<h2 class="onedrive__heading">One Drive Settings <span class="onedrive__heading-pro-tag">PRO</span></h2>';
        echo '<div class="onedrive__wrap" afmp-href="">';
        echo '<h2></h2>';
        echo '<table class="form-table" role="presentation">
				<tbody>
					<tr>
						<th scope="row">
							<label for="onedrive-enable">Enable</label>
						</th>
						<td>
							<input type="checkbox" name="afmp__onedrive_settings[enable]" id="onedrive-enable" value="yes">
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="onedrive-alias">Alias</label>
						</th>
						<td>
							<input class="regular-text" type="text" name="afmp__onedrive_settings[title]" id="onedrive-alias" value=""><p class="desc"><strong>Enter a title which will be displayed on File Manager</strong></p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="onedrive-app-id">Application (client) ID</label>
						</th>
						<td>
							<input class="regular-text" type="text" name="afmp__onedrive_settings[app_id]" id="onedrive-app-id" value="">
							<p class="desc">
								<strong>Enter your OneDrive Application (client) ID from your <a href="#">Azure AD app registration.</a></strong>
							</p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="onedrive-app-secret">Client secret</label>
						</th>
						<td>
							<input class="regular-text" type="text" name="afmp__onedrive_settings[app_secret]" id="onedrive-app-secret" value="">
							<p class="desc">
								<strong>Enter your OneDrive Client secret from your <a href="#">Azure AD app registration.</a></strong>
							</p>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="onedrive-redirect-uri">Redirect URI</label>
						</th>
						<td>
							<input class="regular-text" type="text" name="afmp__onedrive_settings[redirect_uri]" id="onedrive-redirect-uri" value="">
							<p class="desc">
								<strong>Copy this URL and paste it in your Azure AD app registration under Redirect URIs.</strong>
							</p>
						</td>
					</tr>
				</tbody>
			</table>';

        submit_button();

        echo '</div>';
    }

    /**
     * Google Drive menu
     * @since 6.7.2
     */
    public function googledrive_menu()
    {

        echo '<style type="text/css">
            .googledrive__heading {
                color: #000;
                font-size: 18px;
                font-style: normal;
                font-weight: 600;
                line-height: normal;
            }
            
            .googledrive__heading-pro-tag {
                display: inline-block;
                padding: 2px 8px;
                background: linear-gradient(270deg, #011D33 0%, #3F6972 100%);
                border-radius: 4px;
                color: #fff;
                font-size: 12px;
                margin-left: 25px;
            }
            
            .googledrive__wrap {
                opacity: 0.5;
                position:relative;
            }
            
            .googledrive__wrap::before {
                content: "";
                display: block;
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0;
                left: 0;
                z-index: 1;
                background: transparent;
            }
        </style>
        <h2 class="googledrive__heading">Google Drive Settings <span class="googledrive__heading-pro-tag">PRO</span></h2>

        <div class="googledrive__wrap">
            <table class="form-table">
                <tr>
                    <th>
                        <lable for="fma__enable">Enable</lable>
                    </th>
                    <td>
                        <input type="checkbox" id="fma__enable">
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__alias">Alias</label>
                    </th>
                    <td>
                        <input type="text" id="afm__alias" value="" class="regular-text">
                        <p class="desc">
                            <strong>Enter a title which will be displayed on File Manager</strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__app_key">App Key</label>
                    </th>
                    <td>
                        <input type="text" id="afm__app_key" class="regular-text">
                        <p class="desc">
                            <strong>Enter your Google Drive App key, you will get your app key from <a href="#">Google Drive App Console</a></strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__app_secret">App Secret</label>
                    </th>
                    <td>
                        <input type="text" id="afm__app_secret" class="regular-text">
                        <p class="desc">
                            <strong>Enter your Google Drive App secret, you will get your app secret from <a href="#">Google Drive App Console</a></strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__redirect_url">Javascript Origin</label>
                    </th>
                    <td>
                        <input type="text" id="afm__redirect_uri" class="regular-text">
                        
                        <p class="desc">
                            <strong>
                                Copy this URL and paste it in your Google Drive App Console under JavaScripts Origins
                            </strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__redirect_url">Redirect URL</label>
                    </th>
                    <td>
                        <input type="text" id="afm__redirect_uri" class="regular-text">
                        
                        <p class="desc">
                            <strong>
                                Copy this URL and paste it in your Google Drive App Console under Redirect URIs
                            </strong>
                        </p>
                    </td>
                </tr>
            </table>';

        submit_button();

        echo '</div>';
    }

    /**
     * GitHub menu
     * @since 6.7.2
     */
    public function github_menu()
    {

        echo '<style type="text/css">
            .github__heading {
                color: #000;
                font-size: 18px;
                font-style: normal;
                font-weight: 600;
                line-height: normal;
            }

            .github__heading-pro-tag {
                display: inline-block;
                padding: 2px 8px;
                background: linear-gradient(270deg, #011D33 0%, #3F6972 100%);
                border-radius: 4px;
                color: #fff;
                font-size: 12px;
                margin-left: 25px;
            }

            .github__wrap {
                opacity: 0.5;
                position:relative;
            }

            .github__wrap::before {
                content: "";
                display: block;
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0;
                left: 0;
                z-index: 1;
                background: transparent;
            }
        </style>
        <h2 class="github__heading">GitHub Settings <span class="github__heading-pro-tag">PRO</span></h2>

        <div class="github__wrap">
            <table class="form-table">
                <tr>
                    <th>
                        <label for="fma__enable">Enable</label>
                    </th>
                    <td>
                        <input type="checkbox" id="fma__enable">
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__email">GitHub Email</label>
                    </th>
                    <td>
                        <input type="text" id="afm__email" class="regular-text">
                        <p class="desc">
                            <strong>Enter your email which you use for your GitHub account</strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__username">GitHub Username <span class="required">*</span></label>
                    </th>
                    <td>
                        <input type="text" id="afm__username" class="regular-text">
                        <p class="desc">
                            <strong>Enter your GitHub username</strong>
                        </p>
                    </td>
                </tr>

                <tr>
                    <th>
                        <label for="afm__pat">GitHub PAT <span class="required">*</span></label>
                    </th>
                    <td>
                        <input type="text" id="afm__pat" class="regular-text">
                        <p class="desc">
                            <strong>Enter GitHub Personal Access Token (PAT) for your account <a href="#">Click here to get Github PAT</a></strong>
                        </p>
                    </td>
                </tr>

                <tr>
                    <th>
                        <label for="afm__access_dir">GitHub Access Directory</label>
                    </th>
                    <td>
                        <input type="text" id="afm__access_dir" class="regular-text">

                        <p class="desc">
                            <strong>This field is not a required as a default directory is set, but this can be changed</strong>
                        </p>
                    </td>
                </tr>

                <tr>
                    <th>
                        <label for="afm__master_dir">GitHub Master Access Directory</label>
                    </th>
                    <td>
                        <input type="text" id="afm__master_dir" class="regular-text">

                        <p class="desc">
                            <strong>This field is not a required, and if left empty all configuration will apply to the whole repository</strong>
                        </p>
                    </td>
                </tr>
            </table>';
        submit_button();
        echo '</div>';
    }

    /**
     * Amazon S3 (AWS) menu
     * @since 5.3.8
     */
    public function aws_menu()
    {

        echo '<style type="text/css">
            .aws__heading {
                color: #000;
                font-size: 18px;
                font-style: normal;
                font-weight: 600;
                line-height: normal;
            }
            
            .aws__heading-pro-tag {
                display: inline-block;
                padding: 2px 8px;
                background: linear-gradient(270deg, #011D33 0%, #3F6972 100%);
                border-radius: 4px;
                color: #fff;
                font-size: 12px;
                margin-left: 25px;
            }
            
            .aws__wrap {
                opacity: 0.5;
                position:relative;
            }
            
            .aws__wrap::before {
                content: "";
                display: block;
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0;
                left: 0;
                z-index: 1;
                background: transparent;
            }
        </style>
        <h2 class="aws__heading">Amazon S3 (AWS) Settings <span class="aws__heading-pro-tag">PRO</span></h2>

        <div class="aws__wrap">
            <table class="form-table">
                <tr>
                    <th>
                        <lable for="fma__enable">Enable</lable>
                    </th>
                    <td>
                        <input type="checkbox" id="fma__enable">
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__alias">Alias</label>
                    </th>
                    <td>
                        <input type="text" id="afm__alias" class="regular-text">
                        <p class="desc">
                            <strong>Enter a title which will be displayed on File Manager</strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__app_key">App Key <span style="color: red;">*</span></label>
                    </th>
                    <td>
                        <input type="text" id="afm__app_key" class="regular-text">
                        <p class="desc">
                            <strong>Enter your Amazon S3 (AWS) App key. <a href="#">Learn how to get your credentials</a></strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__app_secret">App Secret <span style="color: red;">*</span></label>
                    </th>
                    <td>
                        <input type="text" id="afm__app_secret" class="regular-text">
                        <p class="desc">
                            <strong>Enter your Amazon S3 (AWS) App secret. <a href="#">Learn how to get your credentials</a></strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th>
                        <label for="afm__region">Region <span style="color: red;">*</span></label>
                    </th>
                    <td>
                        <input type="text" id="afm__region" class="regular-text">
                        
                        <p class="desc">
                            <strong>
                                Enter the AWS region where your bucket is located (e.g. us-east-1)
                            </strong>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th>
                        <label for="afm__bucket">Bucket <span style="color: red;">*</span></label>
                    </th>
                    <td>
                        <input type="text" id="afm__bucket" class="regular-text">
                        
                        <p class="desc">
                            <strong>
                                Enter the name of your Amazon S3 bucket
                            </strong>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th>
                        <label for="afm__user_role_access">User Role Access</label>
                    </th>
                    <td>
                        <input type="checkbox" id="editor_role" value class="regular-text">
                        <label for="editor_role">Editor</label><br>
                        <input type="checkbox" id="editor_role" value class="regular-text">
                        <label for="editor_role">Author</label><br>
                        <input type="checkbox" id="editor_role" value class="regular-text">
                        <label for="editor_role">Contributor</label><br>
                        <input type="checkbox" id="editor_role" value class="regular-text">
                        <label for="editor_role">Subscriber</label><br>
                        <p class="desc">
                            <strong>
                                Select the user roles allowed to access the AWS-connected file manager
                            </strong>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th>
                        <label for="afm__private_folder_access">Private Folder Access</label>
                    </th>
                    <td>
                        <input type="text" id="afm__private_folder_access" class="regular-text">
                        
                        <p class="desc">
                            <strong>
                                Enter a folder name to restrict access to that folder only. Leave blank to use the root directory (e.g. awsfolder) 
                            </strong>
                        </p>
                    </td>
                </tr>
            </table>';

        submit_button();

        echo '</div>';
    }

    /**
     * Google Cloud menu
     * @since 5.3.8
     */
    public function googlecloud_menu()
    {

        echo '<style type="text/css">
            .googlecloud__heading {
                color: #000;
                font-size: 18px;
                font-style: normal;
                font-weight: 600;
                line-height: normal;
            }
            
            .googlecloud__heading-pro-tag {
                display: inline-block;
                padding: 2px 8px;
                background: linear-gradient(270deg, #011D33 0%, #3F6972 100%);
                border-radius: 4px;
                color: #fff;
                font-size: 12px;
                margin-left: 25px;
            }
            
            .googlecloud__wrap {
                opacity: 0.5;
                position:relative;
            }
            
            .googlecloud__wrap::before {
                content: "";
                display: block;
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0;
                left: 0;
                z-index: 1;
                background: transparent;
            }
        </style>
        <h2 class="googlecloud__heading">Google Cloud Settings <span class="googlecloud__heading-pro-tag">PRO</span></h2>

        <div class="googlecloud__wrap">
            <table class="form-table">
                <tr>
                    <th>
                        <lable for="fma__enable">Enable</lable>
                    </th>
                    <td>
                        <input type="checkbox" id="fma__enable">
                    </td>
                </tr>
                <tr>
                    <th>
                        <label for="afm__alias">Alias</label>
                    </th>
                    <td>
                        <input type="text" id="afm__alias" class="regular-text">
                        <p class="desc">
                            <strong>Enter a title which will be displayed on File Manager</strong>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th>
                        <label for="afm__auth_key">Authentication Key File <span style="color: red;">*</span></label>
                    </th>
                    <td>
                        <input type="file" id="afm__auth_key" class="regular-text" accept=".json">
                        <p class="desc">
                            <strong>Upload your Google Cloud service account key file (.json format)</strong>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th>
                        <label for="afm__bucket">Bucket <span style="color: red;">*</span></label>
                    </th>
                    <td>
                        <input type="text" id="afm__bucket" class="regular-text">
                        
                        <p class="desc">
                            <strong>
                                Enter the name of your Google Cloud Storage bucket
                            </strong>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th>
                        <label for="afm__user_role_access">User Role Access</label>
                    </th>
                    <td>
                        <input type="checkbox" id="editor_role" value class="regular-text">
                        <label for="editor_role">Editor</label><br>
                        <input type="checkbox" id="editor_role" value class="regular-text">
                        <label for="editor_role">Author</label><br>
                        <input type="checkbox" id="editor_role" value class="regular-text">
                        <label for="editor_role">Contributor</label><br>
                        <input type="checkbox" id="editor_role" value class="regular-text">
                        <label for="editor_role">Subscriber</label><br>
                        <p class="desc">
                            <strong>
                                Select the user roles allowed to access the Google Cloud file manager
                            </strong>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th>
                        <label for="afm__private_folder_access">Private Folder Access</label>
                    </th>
                    <td>
                        <input type="text" id="afm__private_folder_access" class="regular-text">
                        
                        <p class="desc">
                            <strong>
                                Enter a subfolder path within your bucket. Leave blank to use the root directory 
                            </strong>
                        </p>
                        <p class="note" style="color: red;">
                            <strong>Note: </strong>Folder paths and user role values are case-sensitive
                        </p>
                    </td>
                </tr>
            </table>';

        submit_button();

        echo '</div>';
    }

    /**
     * Adminer menu
     * @since 6.7.2
     */
    public function adminer_menu()
    {
        require_once FMAFILEPATH . 'templates/adminer.php';
    }

    public function afmp__file_logs()
    {
        echo <<<HTML
<div class="wrap">

<h2 class="filelogs__heading">File Logs <span class="filelogs__heading-pro-tag">PRO</span></h2>


<div class="file-logs__wrap" afmp-href="https://advancedfilemanager.com/pricing/?utm_source=plugin&utm_medium=file_log_banner&utm_campaign=plugin">
<div class="afma-datatable-header"><a class="button button-secondary" href="#" style="float: right;">Delete All</a><form method="get">
					
					<input type="hidden" name="page" value="afmp-file-logs">
				    <input type="hidden" name="_wpnonce" value="449f66b7cf">
					
					<select name="filter" id="filter" class="afmp__select">
						<option value="all">All</option><option value="renamed">Renamed</option><option value="duplicated">Duplicated</option><option value="uploaded">Uploaded</option><option value="created">Created</option><option value="deleted">Deleted</option><option value="pasted">Pasted</option><option value="updated">Updated</option>
					</select>
					
					<input type="text" name="date-range" id="date-range" class="afmp__input" autocomplete="off" value="" placeholder="Date Range">
					
					<input type="submit" class="button button-secondary" value="Filter">
				</form></div><table class="wp-list-table widefat fixed striped table-view-list ">
			<thead>
	<tr>
		<th scope="col" id="id" class="manage-column column-id column-primary sortable asc"><a href="#"><span>ID</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" id="user_name" class="manage-column column-user_name sortable desc"><a href="https://file-manager-advanced.test/wp-admin/admin.php?page=afmp-file-logs&amp;orderby=user_id&amp;order=asc"><span>User</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort ascending.</span></a></th><th scope="col" id="time" class="manage-column column-time sortable asc"><a href="#"><span>Date &amp; Time</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" id="action" class="manage-column column-action sortable asc"><a href="#"><span>Event</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" id="file_path" class="manage-column column-file_path sortable asc"><a href="#"><span>File Path</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" id="type" class="manage-column column-type sortable asc"><a href="#"><span>Type</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" id="ip" class="manage-column column-ip sortable asc"><a href="#"><span>IP Address</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" id="actions" class="manage-column column-actions">Actions</th>	</tr>
	</thead>

	<tbody id="the-list">
		<tr><td class="id column-id has-row-actions column-primary" data-colname="ID">6<button type="button" class="toggle-row"><span class="screen-reader-text">Show more details</span></button></td><td class="user_name column-user_name" data-colname="User">admin<br>john@flywheel.local</td><td class="time column-time" data-colname="Date &amp; Time">May 02, 2025 12:40 pm</td><td class="action column-action" data-colname="Event">uploaded</td><td class="file_path column-file_path" data-colname="File Path">D:\Local Sites\file-manager-advanced\app\public\wp-content\HeidiSQL.lnk</td><td class="type column-type" data-colname="Type">application/x-ms-shortcut</td><td class="ip column-ip" data-colname="IP Address">127.0.0.1</td><td class="actions column-actions" data-colname="Actions"><div>
				<a class="afmp-show-details" afmp-details="The User ***(admin)*** with IP Address ***(127.0.0.1)*** has just ***(uploaded)*** the file ***(D:\Local Sites\file-manager-advanced\app\public\wp-content\HeidiSQL.lnk)*** of type ***(application/x-ms-shortcut)*** on ***(May 02, 2025 12:40 pm)*** using File Manager on website ***(https://file-manager-advanced.test)***" href="#">
					<span class="dashicons dashicons-visibility"></span>
				</a>
				<a href="#" onclick="return confirm( 'Are you sure you want to delete this file log?' )">
					<span class="dashicons dashicons-trash"></span>
				</a>
			</div></td></tr><tr><td class="id column-id has-row-actions column-primary" data-colname="ID">5<button type="button" class="toggle-row"><span class="screen-reader-text">Show more details</span></button></td><td class="user_name column-user_name" data-colname="User">admin<br>john@flywheel.local</td><td class="time column-time" data-colname="Date &amp; Time">May 02, 2025 12:39 pm</td><td class="action column-action" data-colname="Event">pasted</td><td class="file_path column-file_path" data-colname="File Path">D:\Local Sites\file-manager-advanced\app\public\wp-content\index.php</td><td class="type column-type" data-colname="Type">text/x-php</td><td class="ip column-ip" data-colname="IP Address">127.0.0.1</td><td class="actions column-actions" data-colname="Actions"><div>
				<a class="afmp-show-details" afmp-details="The User ***(admin)*** with IP Address ***(127.0.0.1)*** has just ***(pasted)*** the file ***(D:\Local Sites\file-manager-advanced\app\public\wp-content\index.php)*** of type ***(text/x-php)*** on ***(May 02, 2025 12:39 pm)*** using File Manager on website ***(https://file-manager-advanced.test)***" href="#">
					<span class="dashicons dashicons-visibility"></span>
				</a>
				<a href="#" onclick="return confirm( 'Are you sure you want to delete this file log?' )">
					<span class="dashicons dashicons-trash"></span>
				</a>
			</div></td></tr><tr><td class="id column-id has-row-actions column-primary" data-colname="ID">4<button type="button" class="toggle-row"><span class="screen-reader-text">Show more details</span></button></td><td class="user_name column-user_name" data-colname="User">admin<br>john@flywheel.local</td><td class="time column-time" data-colname="Date &amp; Time">May 02, 2025 12:39 pm</td><td class="action column-action" data-colname="Event">deleted</td><td class="file_path column-file_path" data-colname="File Path">D:\Local Sites\file-manager-advanced\app\public\wp-content\themes\deletedme.php</td><td class="type column-type" data-colname="Type">text/x-php</td><td class="ip column-ip" data-colname="IP Address">127.0.0.1</td><td class="actions column-actions" data-colname="Actions"><div>
				<a class="afmp-show-details" afmp-details="The User ***(admin)*** with IP Address ***(127.0.0.1)*** has just ***(deleted)*** the file ***(D:\Local Sites\file-manager-advanced\app\public\wp-content\themes\deletedme.php)*** of type ***(text/x-php)*** on ***(May 02, 2025 12:39 pm)*** using File Manager on website ***(https://file-manager-advanced.test)***" href="#">
					<span class="dashicons dashicons-visibility"></span>
				</a>
				<a href="#" onclick="return confirm( 'Are you sure you want to delete this file log?' )">
					<span class="dashicons dashicons-trash"></span>
				</a>
			</div></td></tr><tr><td class="id column-id has-row-actions column-primary" data-colname="ID">3<button type="button" class="toggle-row"><span class="screen-reader-text">Show more details</span></button></td><td class="user_name column-user_name" data-colname="User">admin<br>john@flywheel.local</td><td class="time column-time" data-colname="Date &amp; Time">May 02, 2025 12:39 pm</td><td class="action column-action" data-colname="Event">updated</td><td class="file_path column-file_path" data-colname="File Path">D:\Local Sites\file-manager-advanced\app\public\wp-content\themes\deletedme.php</td><td class="type column-type" data-colname="Type">text/x-php</td><td class="ip column-ip" data-colname="IP Address">127.0.0.1</td><td class="actions column-actions" data-colname="Actions"><div>
				<a class="afmp-show-details" afmp-details="The User ***(admin)*** with IP Address ***(127.0.0.1)*** has just ***(updated)*** the file ***(D:\Local Sites\file-manager-advanced\app\public\wp-content\themes\deletedme.php)*** of type ***(text/x-php)*** on ***(May 02, 2025 12:39 pm)*** using File Manager on website ***(https://file-manager-advanced.test)***" href="#">
					<span class="dashicons dashicons-visibility"></span>
				</a>
				<a href="#" onclick="return confirm( 'Are you sure you want to delete this file log?' )">
					<span class="dashicons dashicons-trash"></span>
				</a>
			</div></td></tr><tr><td class="id column-id has-row-actions column-primary" data-colname="ID">2<button type="button" class="toggle-row"><span class="screen-reader-text">Show more details</span></button></td><td class="user_name column-user_name" data-colname="User">admin<br>john@flywheel.local</td><td class="time column-time" data-colname="Date &amp; Time">May 02, 2025 12:39 pm</td><td class="action column-action" data-colname="Event">renamed</td><td class="file_path column-file_path" data-colname="File Path">D:\Local Sites\file-manager-advanced\app\public\wp-content\themes\index copy 1.php</td><td class="type column-type" data-colname="Type">text/x-php</td><td class="ip column-ip" data-colname="IP Address">127.0.0.1</td><td class="actions column-actions" data-colname="Actions"><div>
				<a class="afmp-show-details" afmp-details="The User ***(admin)*** with IP Address ***(127.0.0.1)*** has just ***(renamed)*** the file ***(D:\Local Sites\file-manager-advanced\app\public\wp-content\themes\index copy 1.php)*** of type ***(text/x-php)*** on ***(May 02, 2025 12:39 pm)*** using File Manager on website ***(https://file-manager-advanced.test)***" href="#">
					<span class="dashicons dashicons-visibility"></span>
				</a>
				<a href="#" onclick="return confirm( 'Are you sure you want to delete this file log?' )">
					<span class="dashicons dashicons-trash"></span>
				</a>
			</div></td></tr><tr><td class="id column-id has-row-actions column-primary" data-colname="ID">1<button type="button" class="toggle-row"><span class="screen-reader-text">Show more details</span></button></td><td class="user_name column-user_name" data-colname="User">admin<br>john@flywheel.local</td><td class="time column-time" data-colname="Date &amp; Time">May 02, 2025 12:38 pm</td><td class="action column-action" data-colname="Event">duplicated</td><td class="file_path column-file_path" data-colname="File Path">D:\Local Sites\file-manager-advanced\app\public\wp-content\themes\index copy 1.php</td><td class="type column-type" data-colname="Type">text/x-php</td><td class="ip column-ip" data-colname="IP Address">127.0.0.1</td><td class="actions column-actions" data-colname="Actions"><div>
				<a class="afmp-show-details" afmp-details="The User ***(admin)*** with IP Address ***(127.0.0.1)*** has just ***(duplicated)*** the file ***(D:\Local Sites\file-manager-advanced\app\public\wp-content\themes\index copy 1.php)*** of type ***(text/x-php)*** on ***(May 02, 2025 12:38 pm)*** using File Manager on website ***(https://file-manager-advanced.test)***" href="#">
					<span class="dashicons dashicons-visibility"></span>
				</a>
				<a href="#" onclick="return confirm( 'Are you sure you want to delete this file log?' )">
					<span class="dashicons dashicons-trash"></span>
				</a>
			</div></td></tr>	</tbody>

	<tfoot>
	<tr>
		<th scope="col" class="manage-column column-id column-primary sortable asc"><a href="#"><span>ID</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" class="manage-column column-user_name sortable desc"><a href="https://file-manager-advanced.test/wp-admin/admin.php?page=afmp-file-logs&amp;orderby=user_id&amp;order=asc"><span>User</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort ascending.</span></a></th><th scope="col" class="manage-column column-time sortable asc"><a href="#"><span>Date &amp; Time</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" class="manage-column column-action sortable asc"><a href="#"><span>Event</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" class="manage-column column-file_path sortable asc"><a href="#"><span>File Path</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" class="manage-column column-type sortable asc"><a href="#"><span>Type</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" class="manage-column column-ip sortable asc"><a href="#"><span>IP Address</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort descending.</span></a></th><th scope="col" class="manage-column column-actions">Actions</th>	</tr>
	</tfoot>

</table>
		<div class="afma-datatable-header">	<div class="tablenav bottom">

				<div class="alignleft actions bulkactions">
					</div>
			<div class="tablenav-pages one-page"><span class="displaying-num">6 items</span>
<span class="pagination-links"><span class="tablenav-pages-navspan button disabled" aria-hidden="true">«</span>
<span class="tablenav-pages-navspan button disabled" aria-hidden="true">‹</span>
<span class="screen-reader-text">Current Page</span><span id="table-paging" class="paging-input"><span class="tablenav-paging-text">1 of <span class="total-pages">1</span></span></span>
<span class="tablenav-pages-navspan button disabled" aria-hidden="true">›</span>
<span class="tablenav-pages-navspan button disabled" aria-hidden="true">»</span></span></div>
		<br class="clear">
	</div>
		</div></div></div>
HTML;

    }

    /** 
     * Fma permissions
     */
    public function fmaPer()
    {
        $settings = $this->get();
        $user = wp_get_current_user();
        $allowed_fma_user_roles = isset($settings['fma_user_roles']) ? $settings['fma_user_roles'] : array('administrator');

        if (!in_array('administrator', $allowed_fma_user_roles)) {
            $fma_user_roles = array_merge(array('administrator'), $allowed_fma_user_roles);
        } else {
            $fma_user_roles = $allowed_fma_user_roles;
        }

        $checkUserRoleExistance = array_intersect($fma_user_roles, $user->roles);

        if (count($checkUserRoleExistance) > 0 && !in_array('administrator', $checkUserRoleExistance)) {
            $fmaPer = 'read';
        } else {
            $fmaPer = 'manage_options';
        }
        return $fmaPer;
    }

    /**
     * True when the user may open File Manager but must not see settings/admin tabs (non-administrator in fma_user_roles).
     *
     * @return bool
     */
    public static function is_file_manager_only_user()
    {
        if (!is_user_logged_in() || current_user_can('manage_options')) {
            return false;
        }

        $settings = get_option('fmaoptions');
        if (!is_array($settings)) {
            return false;
        }

        $user = wp_get_current_user();
        $allowed_fma_user_roles = isset($settings['fma_user_roles']) && is_array($settings['fma_user_roles'])
            ? $settings['fma_user_roles']
            : array('administrator');

        if (!in_array('administrator', $allowed_fma_user_roles, true)) {
            $fma_user_roles = array_merge(array('administrator'), $allowed_fma_user_roles);
        } else {
            $fma_user_roles = $allowed_fma_user_roles;
        }

        $check_user_role_existance = array_intersect($fma_user_roles, $user->roles);
        if (count($check_user_role_existance) === 0) {
            return false;
        }

        return !in_array('administrator', $check_user_role_existance, true);
    }

    /**
     * Redirect FM-only users away from other AFM admin pages (DB Access, legacy settings URLs, etc.).
     */
    public function restrict_fm_only_admin_access()
    {
        if (!self::is_file_manager_only_user()) {
            return;
        }

        if (!is_admin() || wp_doing_ajax()) {
            return;
        }

        $page = isset($_GET['page']) ? sanitize_text_field(wp_unslash($_GET['page'])) : '';
        if ($page === '' || $page === 'file_manager_advanced_ui') {
            return;
        }

        $blocked_prefixes = array(
            'file_manager_advanced',
            'afmp-',
            'fma_',
        );

        foreach ($blocked_prefixes as $prefix) {
            if (strpos($page, $prefix) === 0) {
                wp_safe_redirect(admin_url('admin.php?page=file_manager_advanced_ui#/filemanager'));
                exit;
            }
        }
    }

    /**
     * Hide all File Manager submenus except the main UI entry for FM-only roles.
     */
    public function trim_fm_submenus_for_restricted_users()
    {
        if (!self::is_file_manager_only_user()) {
            return;
        }

        global $submenu;
        if (!isset($submenu['file_manager_advanced_ui']) || !is_array($submenu['file_manager_advanced_ui'])) {
            return;
        }

        $trimmed = array();
        foreach ($submenu['file_manager_advanced_ui'] as $item) {
            if (isset($item[2]) && $item[2] === 'file_manager_advanced_ui') {
                $trimmed[] = $item;
                break;
            }
        }

        $submenu['file_manager_advanced_ui'] = $trimmed;
    }

    /**
     * Fma - Network Permissions
     */
    public function networkPer()
    {
        $settings = $this->get();
        $user = wp_get_current_user();
        $allowed_fma_user_roles = isset($settings['fma_user_roles']) ? $settings['fma_user_roles'] : array();

        $fma_user_roles = $allowed_fma_user_roles;

        $checkUserRoleExistance = array_intersect($fma_user_roles, $user->roles);

        if (count($checkUserRoleExistance) > 0) {
            if (!in_array('administrator', $checkUserRoleExistance)) {
                $fmaPer = 'read';
            } else {
                $fmaPer = 'manage_options';
            }
        } else {
            $fmaPer = 'manage_network';
        }
        return $fmaPer;
    }
    /**
     * Diaplying AFM
     */
    public function file_manager_advanced_ui()
    {
        $fmaPer = $this->fmaPer();
        if (current_user_can($fmaPer)) {
            include('pages/main.php');
        }
    }
    /**
     * Settings
     */
    public function file_manager_advanced_controls()
    {
        if (current_user_can('manage_options')) {
            include('pages/controls.php');
        }
    }
    /**
     * Shortcode
     */
    public function file_manager_advanced_shortcodes()
    {
        if (current_user_can('manage_options')) {
            include('pages/buy_shortcode.php');
        }
    }
    /**
     * Saving Options
     */
    public function save()
    {
        if (isset($_POST['submit']) && wp_verify_nonce($_POST['_fmaform'], 'fmaform')) {
            _e('Saving options, Please wait...', 'file-manager-advanced');
            $save = array();
            $defaultRole = array('administrator');
            if (is_multisite()) {
                $defaultRole = array();
            }
            $public_dir = isset($_POST['public_path']) ? sanitize_text_field($_POST['public_path']) : '';
            $save['fma_user_roles'] = isset($_POST['fma_user_role']) ? array_map('sanitize_text_field', $_POST['fma_user_role']) : $defaultRole;
            $save['fma_theme'] = isset($_POST['fma_theme']) ? sanitize_text_field($_POST['fma_theme']) : 'light';
            $save['fma_locale'] = isset($_POST['fma_locale']) ? sanitize_text_field($_POST['fma_locale']) : 'en';
            /* Directory Traversal fix @220723 */
            $save['public_path'] = $this->afm_sanitize_directory($public_dir);
            $save['public_url'] = isset($_POST['public_url']) ? sanitize_text_field($_POST['public_url']) : '';
            //25122022
            $save['upload_max_size'] = isset($_POST['upload_max_size']) ? sanitize_text_field($_POST['upload_max_size']) : '0';
            $save['display_ui_options'] = isset($_POST['display_ui_options']) ? array_map('sanitize_text_field', $_POST['display_ui_options']) : array();
            $save['hide_path'] = isset($_POST['hide_path']) ? sanitize_text_field($_POST['hide_path']) : 0;
            $save['enable_trash'] = isset($_POST['enable_trash']) ? sanitize_text_field($_POST['enable_trash']) : 0;
            $save['enable_htaccess'] = isset($_POST['enable_htaccess']) ? sanitize_text_field($_POST['enable_htaccess']) : 0;
            $save['fma_upload_allow'] = isset($_POST['fma_upload_allow']) ? sanitize_text_field($_POST['fma_upload_allow']) : 'all';
            $save['fma_cm_theme'] = isset($_POST['fma_cm_theme']) ? sanitize_text_field($_POST['fma_cm_theme']) : 'default';
            $save['fma_debug_enabled'] = isset($_POST['fma_debug_enabled']) ? sanitize_text_field($_POST['fma_debug_enabled']) : 0;
            $u = update_option('fmaoptions', $save);
            if ($u) {
                $this->f('?page=file_manager_advanced_controls&status=1');
            } else {
                $this->f('?page=file_manager_advanced_controls&status=2');
            }
        }
    }
    /**
     * Sanitize directory path
     */
    public function afm_sanitize_directory($path = '')
    {
        if (!empty($path)) {
            $path = str_replace('..', '', htmlentities(trim($path)));
        }
        return $path;
    }
    /**
     * Getting Options
     */
    public function get()
    {
        return get_option('fmaoptions');
    }
    /**
     * Diplay Notices
     */
    public function notice($type, $message)
    {
        if (isset($type) && !empty($type)) {
            $class = ($type == '1') ? 'updated' : 'error';
            return '<div class="' . $class . ' notice">
		  <p>' . $message . '</p>
		  </div>';
        }
    }
    /**
     * Redirection
     */
    public function f($u)
    {
        $url = esc_url_raw($u);
        wp_register_script('fma-redirect-script', '');
        wp_enqueue_script('fma-redirect-script');
        wp_add_inline_script(
            'fma-redirect-script',
            ' window.location.href="' . $url . '" ;'
        );
    }
    public static function shortcodeUpdateNotice()
    {
        if (class_exists('file_manager_advanced_shortcode')):
            if (defined('fmas_ver')) {
                if (fmas_ver < '2.4.1') {
                    return '<div class="error notice" style="background: #f7dfdf">
					<p><strong>Advanced File manager shortcode addon update:</strong> You are using version <strong>' . fmas_ver . '</strong> we recommend you to update to latest version. If you did not receive update please download from <a href="https://advancedfilemanager.com/my-account/" target="_blank">my account</a> page.</p>
					</div>';
                }
            } else {
                return '<div class="error notice" style="background: #f7dfdf">
					<p><strong>Advanced File manager shortcode addon update:</strong> You are using old version, we recommend you to update to latest version. If you did not receive update please download from <a href="https://advancedfilemanager.com/my-account/" target="_blank">my account</a> page.</p>
					</div>';
            }
        endif;
    }
    /**
     * Get User Roles
     */
    public function wpUserRoles()
    {
        global $wp_roles;
        return $wp_roles->roles;
    }
}


