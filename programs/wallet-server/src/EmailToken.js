import { createToken } from "@graphene/time-token"
import { spawn } from "child_process"
import bs58 from "bs58"

export default function emailToken(mail_to) {
    let token = createToken(mail_to)
    token = bs58.encode(new Buffer(token, 'binary'))
    const mail_from = process.env.npm_package_config_mail_from
    const mail_subject = process.env.npm_package_config_mail_subject
    const mail_script = process.env.npm_package_config_mail_script
    const mail_token_url = process.env.npm_package_config_mail_token_url.replace("${token}", token)
    return spawn(mail_script, [mail_from, mail_to, token, mail_token_url, mail_subject])
}