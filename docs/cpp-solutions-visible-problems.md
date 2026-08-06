# C++ Solutions for Visible Problems

These are copy-ready LeetCode-style C++ solutions for the problems visible in the screenshot. For tree problems, LeetCode supplies the `TreeNode` definition.

## Longest Increasing Subsequence

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        vector<int> tails;
        for (int x : nums) {
            auto it = lower_bound(tails.begin(), tails.end(), x);
            if (it == tails.end()) tails.push_back(x);
            else *it = x;
        }
        return (int)tails.size();
    }
};
```

## Number of Islands

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int m = grid.size(), n = grid[0].size(), ans = 0;
        vector<int> dirs = {1, 0, -1, 0, 1};

        function<void(int, int)> dfs = [&](int r, int c) {
            if (r < 0 || c < 0 || r >= m || c >= n || grid[r][c] != '1') return;
            grid[r][c] = '0';
            for (int i = 0; i < 4; ++i) dfs(r + dirs[i], c + dirs[i + 1]);
        };

        for (int r = 0; r < m; ++r) {
            for (int c = 0; c < n; ++c) {
                if (grid[r][c] == '1') {
                    ++ans;
                    dfs(r, c);
                }
            }
        }
        return ans;
    }
};
```

## Same Tree

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isSameTree(TreeNode* p, TreeNode* q) {
        if (!p || !q) return p == q;
        return p->val == q->val
            && isSameTree(p->left, q->left)
            && isSameTree(p->right, q->right);
    }
};
```

## Network Delay Time

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        vector<vector<pair<int, int>>> graph(n + 1);
        for (auto& e : times) graph[e[0]].push_back({e[1], e[2]});

        const int INF = 1e9;
        vector<int> dist(n + 1, INF);
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
        dist[k] = 0;
        pq.push({0, k});

        while (!pq.empty()) {
            auto [d, u] = pq.top();
            pq.pop();
            if (d != dist[u]) continue;

            for (auto [v, w] : graph[u]) {
                if (d + w < dist[v]) {
                    dist[v] = d + w;
                    pq.push({dist[v], v});
                }
            }
        }

        int ans = 0;
        for (int i = 1; i <= n; ++i) {
            if (dist[i] == INF) return -1;
            ans = max(ans, dist[i]);
        }
        return ans;
    }
};
```

## Daily Temperatures

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
        int n = temperatures.size();
        vector<int> ans(n), st;
        for (int i = 0; i < n; ++i) {
            while (!st.empty() && temperatures[i] > temperatures[st.back()]) {
                ans[st.back()] = i - st.back();
                st.pop_back();
            }
            st.push_back(i);
        }
        return ans;
    }
};
```

## Flood Fill

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> floodFill(vector<vector<int>>& image, int sr, int sc, int color) {
        int old = image[sr][sc];
        if (old == color) return image;

        int m = image.size(), n = image[0].size();
        vector<int> dirs = {1, 0, -1, 0, 1};

        function<void(int, int)> dfs = [&](int r, int c) {
            if (r < 0 || c < 0 || r >= m || c >= n || image[r][c] != old) return;
            image[r][c] = color;
            for (int i = 0; i < 4; ++i) dfs(r + dirs[i], c + dirs[i + 1]);
        };

        dfs(sr, sc);
        return image;
    }
};
```

## Binary Search

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int search(vector<int>& nums, int target) {
        int lo = 0, hi = (int)nums.size() - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
};
```

## Longest Univalue Path

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
    int best = 0;

    int dfs(TreeNode* node) {
        if (!node) return 0;
        int left = dfs(node->left);
        int right = dfs(node->right);
        int leftPath = node->left && node->left->val == node->val ? left + 1 : 0;
        int rightPath = node->right && node->right->val == node->val ? right + 1 : 0;
        best = max(best, leftPath + rightPath);
        return max(leftPath, rightPath);
    }

public:
    int longestUnivaluePath(TreeNode* root) {
        dfs(root);
        return best;
    }
};
```

## Redundant Connection

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
    vector<int> parent, rankv;

    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);
        return parent[x];
    }

    bool unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (rankv[ra] < rankv[rb]) swap(ra, rb);
        parent[rb] = ra;
        if (rankv[ra] == rankv[rb]) ++rankv[ra];
        return true;
    }

public:
    vector<int> findRedundantConnection(vector<vector<int>>& edges) {
        int n = edges.size();
        parent.resize(n + 1);
        rankv.assign(n + 1, 0);
        iota(parent.begin(), parent.end(), 0);

        for (auto& e : edges) {
            if (!unite(e[0], e[1])) return e;
        }
        return {};
    }
};
```

## Find K Closest Elements

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> findClosestElements(vector<int>& arr, int k, int x) {
        int lo = 0, hi = arr.size() - k;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (x - arr[mid] > arr[mid + k] - x) lo = mid + 1;
            else hi = mid;
        }
        return vector<int>(arr.begin() + lo, arr.begin() + lo + k);
    }
};
```

## Task Scheduler

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int leastInterval(vector<char>& tasks, int n) {
        vector<int> freq(26);
        for (char task : tasks) ++freq[task - 'A'];

        int mx = *max_element(freq.begin(), freq.end());
        int cntMax = count(freq.begin(), freq.end(), mx);
        int frame = (mx - 1) * (n + 1) + cntMax;
        return max((int)tasks.size(), frame);
    }
};
```

## Valid Triangle Number

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int triangleNumber(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int n = nums.size(), ans = 0;
        for (int k = n - 1; k >= 2; --k) {
            int i = 0, j = k - 1;
            while (i < j) {
                if (nums[i] + nums[j] > nums[k]) {
                    ans += j - i;
                    --j;
                } else {
                    ++i;
                }
            }
        }
        return ans;
    }
};
```

## Permutation in String

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool checkInclusion(string s1, string s2) {
        if (s1.size() > s2.size()) return false;

        vector<int> need(26), window(26);
        for (char c : s1) ++need[c - 'a'];

        int k = s1.size();
        for (int i = 0; i < (int)s2.size(); ++i) {
            ++window[s2[i] - 'a'];
            if (i >= k) --window[s2[i - k] - 'a'];
            if (window == need) return true;
        }
        return false;
    }
};
```

## Subarray Sum Equals K

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int subarraySum(vector<int>& nums, int k) {
        unordered_map<int, int> seen;
        seen[0] = 1;

        int sum = 0, ans = 0;
        for (int x : nums) {
            sum += x;
            if (seen.count(sum - k)) ans += seen[sum - k];
            ++seen[sum];
        }
        return ans;
    }
};
```

## 01 Matrix

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> updateMatrix(vector<vector<int>>& mat) {
        int m = mat.size(), n = mat[0].size();
        vector<vector<int>> dist(m, vector<int>(n, -1));
        queue<pair<int, int>> q;

        for (int r = 0; r < m; ++r) {
            for (int c = 0; c < n; ++c) {
                if (mat[r][c] == 0) {
                    dist[r][c] = 0;
                    q.push({r, c});
                }
            }
        }

        vector<int> dirs = {1, 0, -1, 0, 1};
        while (!q.empty()) {
            auto [r, c] = q.front();
            q.pop();

            for (int i = 0; i < 4; ++i) {
                int nr = r + dirs[i], nc = c + dirs[i + 1];
                if (nr < 0 || nc < 0 || nr >= m || nc >= n || dist[nr][nc] != -1) continue;
                dist[nr][nc] = dist[r][c] + 1;
                q.push({nr, nc});
            }
        }
        return dist;
    }
};
```

## Non-overlapping Intervals

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end(), [](const auto& a, const auto& b) {
            return a[1] < b[1];
        });

        int removed = 0, end = intervals[0][1];
        for (int i = 1; i < (int)intervals.size(); ++i) {
            if (intervals[i][0] < end) {
                ++removed;
            } else {
                end = intervals[i][1];
            }
        }
        return removed;
    }
};
```

## Split Array Largest Sum

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int splitArray(vector<int>& nums, int k) {
        long long lo = *max_element(nums.begin(), nums.end());
        long long hi = accumulate(nums.begin(), nums.end(), 0LL);

        auto can = [&](long long limit) {
            int parts = 1;
            long long cur = 0;
            for (int x : nums) {
                if (cur + x > limit) {
                    ++parts;
                    cur = 0;
                }
                cur += x;
            }
            return parts <= k;
        };

        while (lo < hi) {
            long long mid = lo + (hi - lo) / 2;
            if (can(mid)) hi = mid;
            else lo = mid + 1;
        }
        return (int)lo;
    }
};
```

## Decode String

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string decodeString(string s) {
        stack<int> counts;
        stack<string> prev;
        string cur;
        int num = 0;

        for (char ch : s) {
            if (isdigit(ch)) {
                num = num * 10 + (ch - '0');
            } else if (ch == '[') {
                counts.push(num);
                prev.push(cur);
                num = 0;
                cur.clear();
            } else if (ch == ']') {
                int repeat = counts.top();
                counts.pop();
                string base = prev.top();
                prev.pop();
                while (repeat--) base += cur;
                cur = base;
            } else {
                cur += ch;
            }
        }
        return cur;
    }
};
```

## Sum of Two Integers

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int getSum(int a, int b) {
        while (b != 0) {
            unsigned carry = ((unsigned)a & (unsigned)b) << 1;
            a = a ^ b;
            b = (int)carry;
        }
        return a;
    }
};
```

## Counting Bits

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> ans(n + 1);
        for (int i = 1; i <= n; ++i) {
            ans[i] = ans[i >> 1] + (i & 1);
        }
        return ans;
    }
};
```
