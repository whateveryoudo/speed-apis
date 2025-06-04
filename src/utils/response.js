/**
 * API响应工具类
 */
class ResponseUtil {
  /**
   * 成功响应
   * @param {Object} data - 响应数据
   * @param {string} [message='操作成功'] - 响应消息
   * @param {number} [code=200] - 响应状态码
   * @returns {Object} 统一格式的响应对象
   */
  static success(data = null, message = '操作成功', code = 200) {
    return {
      code,
      success: true,
      message,
      data
    };
  }

  /**
   * 错误响应
   * @param {string} [message='操作失败'] - 错误消息
   * @param {number} [code=500] - 错误状态码
   * @param {Object} [data=null] - 错误详情
   * @returns {Object} 统一格式的错误响应对象
   */
  static error(message = '操作失败', code = 500, data = null) {
    return {
      code,
      success: false,
      message,
      data
    };
  }

  /**
   * 未授权响应
   * @param {string} [message='无权限访问'] - 错误消息
   * @returns {Object} 统一格式的未授权响应对象
   */
  static unauthorized(message = '无权限访问') {
    return this.error(message, 401);
  }

  /**
   * 资源不存在响应
   * @param {string} [message='资源不存在'] - 错误消息
   * @returns {Object} 统一格式的资源不存在响应对象
   */
  static notFound(message = '资源不存在') {
    return this.error(message, 404);
  }
}

module.exports = ResponseUtil; 