/**
 * GitHub API adapter — создать/обновить profile README репозиторий.
 *
 * Требования:
 * - GITHUB_TOKEN (Personal Access Token с правом repo)
 * - GITHUB_USERNAME
 *
 * Создаёт специальный репозиторий {username}/{username} с README.md,
 * который GitHub рендерит как профиль.
 */
const BaseSubmitAdapter = require('./base');

class GitHubAdapter extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const token = process.env.GITHUB_TOKEN?.trim();
    const username = process.env.GITHUB_USERNAME?.trim();
    if (!token || !username) {
      return { ok: false, error: 'GITHUB_TOKEN or GITHUB_USERNAME not configured' };
    }
    const content = this.render(link.content_template || link.title, ctx);
    const headers = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'WonerBot/1.0',
    };
    // 1. Проверяем, существует ли profile repo
    const repoCheck = await this.httpGet(`https://api.github.com/repos/${username}/${username}`, { headers });
    if (repoCheck.status === 404) {
      // Создаём
      const create = await this.httpPost('https://api.github.com/user/repos', {
        headers: { ...headers, 'Content-Type': 'application/json' },
        data: JSON.stringify({
          name: username,
          description: 'Woner profile',
          homepage: ctx.trackedUrl,
          private: false,
          has_readme: true,
          auto_init: true,
        }),
      });
      if (!create.ok) {
        return { ok: false, error: `repo create failed: ${JSON.stringify(create.data).slice(0, 300)}` };
      }
    }
    // 2. Записываем README.md
    const readmeContent = Buffer.from(content).toString('base64');
    const writeRes = await this.httpGet(`https://api.github.com/repos/${username}/${username}/contents/README.md`, { headers });
    const sha = writeRes.data?.sha;
    const update = await this.httpPost(`https://api.github.com/repos/${username}/${username}/contents/README.md`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: JSON.stringify({
        message: 'update profile readme',
        content: readmeContent,
        sha,
      }),
    });
    if (!update.ok && update.status !== 201) {
      return { ok: false, error: `readme update failed: ${JSON.stringify(update.data).slice(0, 300)}` };
    }
    return {
      ok: true,
      externalUrl: `https://github.com/${username}`,
      message: 'github profile updated',
    };
  }
}

module.exports = GitHubAdapter;